/*
Copyright 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/* eslint no-constant-condition: [ "error", { "checkLoops": false } ], prefer-template: 1 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import cypress from 'cypress';
import * as crypto from 'crypto';
import * as process from 'process';

function registerClient(trafficlightUrl: string, uuid: string) {
    console.log('Registering trafficlight client');

    const data = JSON.stringify({
        type: 'element-web',
        version: 'UNKNOWN', // at some point we need to know this, but for now it's hard to determine.
    });
    const target = `${trafficlightUrl}/client/${uuid}/register`;
    const promise = fetch(target, { method: 'POST', body: data, headers: { 'Content-Type': 'application/json' } })
        .then((response) => {
            if (response.status != 200) {
                throw new Error(`Unable to register client, got ${ response.status } from server`);
            } else {
                console.log(`Registered to trafficlight as ${uuid}`);
            }
        });
    return promise;
}

function reportError(trafficlightUrl: string, uuid: string, path: string, details: string, type: string) {
    console.log('Reporting error in client');

    const data = JSON.stringify({
        error: {
            type: type,
            path: path,
            details: details,
        },
    });
    const target = `${trafficlightUrl}/client/${uuid}/error`;
    const promise = fetch(target, { method: 'POST', body: data, headers: { 'Content-Type': 'application/json' } })
        .then((response) => {
            if (response.status != 200) {
                console.log(`Failed to report error ${data}`);
            } else {
                console.log(`Reported error`);
            }
        });
    return promise;
}

async function uploadVideo(trafficlightUrl: string, uuid: string) {
    return uploadFile(trafficlightUrl, uuid, `cypress/videos/trafficlight/${uuid}/trafficlight.spec.ts.mp4`);
}
async function uploadFile(trafficlightUrl: string, uuid: string, filename: string) {
    console.log('Uploading file from client');

    const formData = new FormData();
    const filestream = fs.createReadStream(filename);
    formData.append('file', filestream, { contentType: 'application/octet-stream', filename: filename });

    const target = `${trafficlightUrl}/client/${uuid}/upload`;
    const promise = fetch(target, { method: 'POST', body: formData })
        .then((response) => {
            if (response.status != 200) {
                console.log(`Failed to upload file  ${filename}`);
            } else {
                console.log(`Uploaded file`);
            }
        });
    return promise;
}

async function runCypress(trafficlightUrl: string, uuid: string, openMode: boolean): Promise<boolean> {
    const cypressOptions = {
        headed: false,
        // @ts-ignore-next-line
        exit: true,
        quiet: false,
        browser: 'chromium',
        spec: './cypress/e2e/trafficlight/trafficlight.spec.ts',
        env: {
            'TRAFFICLIGHT_URL': trafficlightUrl,
            'TRAFFICLIGHT_UUID': uuid,
            //'XDG_CONFIG_HOME': `/tmp/cypress-home/${Math.ceil(Math.random() * Number.MAX_SAFE_INTEGER)}`
        },
        config: {
            retries: { // Override cypress.json - we want to run exactly once.
                'openMode': openMode ? 1 : 0,
                'runMode': 0,
            },
            e2e: {
                excludeSpecPattern: [],
            },
            videosFolder: `cypress/videos/trafficlight/${uuid}/`,
        },
    };
    let result;
    try {
        result = await cypress.run(cypressOptions);
    } catch (err) {
        console.error('Could not execute tests:', err);
        const errorType = err.name == "TimeoutError" ? "action": "adapter";
        await reportError(trafficlightUrl, uuid, "unknown", err.stack, errorType);
        return false;
    } finally {
        await uploadFile(trafficlightUrl, uuid, `cypress/logs/trafficlight/${uuid}/out.txt`);
        await uploadVideo(trafficlightUrl, uuid);
    }

    // @ts-ignore-next-line
    if (result.totalFailed !== 0) {
        console.error('Some assertion failed, probably mentioned above');
        await reportError(trafficlightUrl, uuid, "unknown", result.runs[0].tests[0].displayError, "action");
        return false;
    } else {
        return true;
    }
}

const trafficlightUrl = process.env.TRAFFICLIGHT_URL || 'http://127.0.0.1:5000';

var openMode = false;
for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] == "open") {
        openMode = true;
    }
}

const uuid = crypto.randomUUID();
registerClient(trafficlightUrl, uuid).then((result) => {
    runCypress(trafficlightUrl, uuid, openMode);
});
