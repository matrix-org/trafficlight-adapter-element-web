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

/// <reference types='cypress' />

import fetch from "node-fetch";

import { login, logout, register } from "./actions/auth";
import { advanceClock, clearIDBStorage, exit, idle, reload, wait } from "./actions/browser";
import {
    acceptCrossSigningRequest,
    enableDehydratedDevice,
    enableKeyBackup,
    startCrossSigning,
    verifyCrossSigningEmoji,
    verifyDeviceIsTrusted,
} from "./actions/e2ee";
import {
    acceptInvite,
    changeRoomHistoryVisibility,
    createDm,
    createRoom,
    inviteUser,
    openRoom,
} from "./actions/room";
import {
    sendMessage,
    verifyLastMessageIsTrusted,
    verifyLastMessageIsUTD,
    verifyMessageInTimeline,
} from "./actions/timeline";

type JSONValue =
    | string
    | number
    | boolean
    | { [x: string]: JSONValue }
    | Array<JSONValue>;

Cypress.on('uncaught:exception', (e, runnable) => {
    console.log("uncaught exception", e.message);
    const errorUrl = `${Cypress.env('TRAFFICLIGHT_URL') }/client/${ Cypress.env('TRAFFICLIGHT_UUID') }/error`;
    const errorPath = e.stack?.split("\n")[0];
    const body = JSON.stringify({
        error: {
            type: e.name,
            details: e.message,
            path: errorPath,
        },
    });
    fetch(errorUrl, { method: "POST", body });
    return false;
});

Cypress.on('fail', (e) => {
    const errorUrl = `${Cypress.env('TRAFFICLIGHT_URL') }/client/${ Cypress.env('TRAFFICLIGHT_UUID') }/error`;
    const errorPath = e.stack?.split("\n").slice(1).join("\n");
    const body = JSON.stringify({
        error: {
            type: e.name,
            details: e.message,
            path: errorPath,
        },
    });
    fetch(errorUrl, {
        method: "post",
        body,
        headers: { 'Content-Type': 'application/json' },
    });
    throw e;
});

describe('traffic light client', () => {
    it('runs a trafficlight client once', () => {
        recurse();
    });
});

/*
 * Core loop of the trafficlight client.
 * We call it recurse() and loop via recursion rather than traditional looping
 * as cypress works in a native promise like way, tasks are enqueued for later work/matching.
 *
 * Each cycle pulls one request from the trafficlight server and acts on it.
 */
function recurse() {
    cy.log('Requesting next action...');
    const pollUrl = `${Cypress.env('TRAFFICLIGHT_URL') }/client/${ Cypress.env('TRAFFICLIGHT_UUID') }/poll`;
    const respondUrl = `${Cypress.env('TRAFFICLIGHT_URL') }/client/${ Cypress.env('TRAFFICLIGHT_UUID') }/respond`;

    function sendResponse(responseStatus) {
        cy.request('POST', respondUrl, { response: responseStatus }).then((response) => {
            expect(response.status).to.eq(200);
        });
    }
    cy.request(pollUrl).then((resp) => {
        expect(resp.status).to.eq(200);
        // promote response out of the callback for future use.
        const data: JSONValue = resp.body.data;
        const action: string = resp.body.action;
        cy.log('running action', action, JSON.stringify(data));
        let result;
        try {
            result = runAction(action, data);
        } catch (e) {
            // Don't keep running if we encounter an error!
            return;
        }
        if (result) {
            sendResponse(result);
        }
        if (action !== 'exit') {
            recurse();
        }
    });
}

function runAction(action: string, data: JSONValue): string | undefined {
    switch (action) {
        // Auth
        case 'register':
            return register(data);
        case 'login':
            return login(data);
        case "logout":
            return logout();

        // E2EE
        case 'start_crosssign': {
            const userId = data?.["userId"];
            return startCrossSigning(userId);
        }
        case 'accept_crosssign':
            return acceptCrossSigningRequest();
        case 'verify_crosssign_emoji':
            return verifyCrossSigningEmoji();
        case "verify_trusted_device":
            return verifyDeviceIsTrusted();
        case "enable_dehydrated_device": {
            const passphrase = data?.["key_backup_passphrase"];
            if (!passphrase) {
                throw new Error("'key_backup_passphrase' not in data for action 'enable_dehydrated_device'");
            }
            return enableDehydratedDevice(passphrase);
        }
        case "enable_key_backup": {
            const passphrase = data?.["key_backup_passphrase"];
            if (!passphrase) {
                throw new Error("'key_backup_passphrase' not in data for action 'enable_key_backup'");
            }
            return enableKeyBackup(passphrase);
        }

        // Room
        case 'create_room': {
            const name = data?.["name"];
            if (!name) {
                throw new Error("'name' not in data for action 'create_room'");
            }
            const topic = data?.["topic"];
            return createRoom(name, topic);
        }
        case 'create_dm': {
            const userId = data?.["userId"];
            if (!userId) {
                throw new Error("'id' not in data for action 'create_dm'");
            }
            return createDm(userId);
        }
        case "change_room_history_visibility": {
            const historyVisiblity = data["historyVisibility"];
            if (!historyVisiblity) {
                throw new Error("'historyVisibility' not in data for action 'change_room_history_visibility'");
            }
            const acceptedValues = ["shared", "invited", "joined"];
            if (!acceptedValues.includes(historyVisiblity)) {
                throw new Error(
                    `historyVisibility should be one of ${acceptedValues.join(", ")}, but found ${historyVisiblity}!`);
            }
            return changeRoomHistoryVisibility(historyVisiblity);
        }
        case "open_room": {
            const name = data["name"];
            if (!name) {
                throw new Error("'name' not in data for action 'open_room'");
            }
            return openRoom(name);
        }
        case "accept_invite":
            return acceptInvite();
        case "invite_user": {
            const userId = data["userId"];
            if (!userId) {
                throw new Error("'userId' not in data for action 'invite_user'");
            }
            return inviteUser(userId);
        }

        // Timeline
        case 'send_message': {
            const message = data["message"];
            if (!message) {
                throw new Error("'message' not in data for action 'send_message'");
            }
            return sendMessage(message);
        }
        case "verify_message_in_timeline": {
            const message = data["message"];
            if (!message) {
                throw new Error("'message' not in data for action 'verify_message_in_timeline'");
            }
            return verifyMessageInTimeline(message);
        }
        case "verify_last_message_is_utd":
            return verifyLastMessageIsUTD();
        case "verify_last_message_is_trusted":
            return verifyLastMessageIsTrusted();

        // Browser
        case 'idle':
            idle();
            break;
        case 'wait': {
            const time = data?.["time"];
            return wait(time);
        }
        case "advance_clock": {
            const milliseconds = data["milliseconds"];
            if (!milliseconds) {
                throw new Error("'milliseconds' not in data for action 'advance_clock'");
            }
            return advanceClock(milliseconds);
        }
        case "clear_idb_storage":
            return clearIDBStorage();
        case "reload":
            return reload();
        case 'exit':
            exit();
            break;

        default:
            throw new Error(`WARNING: unknown action "${action}"`);
    }
}
