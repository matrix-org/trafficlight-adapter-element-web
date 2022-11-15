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
    console.log(e.message);
    const body = JSON.stringify({
        error: {
            type: e.name,
            details: e.message,
            path: "foo/bar",
        },
    });
    fetch(errorUrl, { method: "POST", body });
    return false;
});

Cypress.on('fail', (e) => {
    const errorUrl = `${Cypress.env('TRAFFICLIGHT_URL') }/client/${ Cypress.env('TRAFFICLIGHT_UUID') }/error`;
    console.log("fail", e.message);
    const body = JSON.stringify({
        error: {
            type: e.name,
            details: e.message,
            path: "foo/bar",
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
        case 'start_crosssign':
            return startCrossSigning(data);
        case 'accept_crosssign':
            return acceptCrossSigningRequest();
        case 'verify_crosssign_emoji':
            return verifyCrossSigningEmoji();
        case "verify_trusted_device":
            return verifyDeviceIsTrusted();
        case "enable_dehydrated_device":
            return enableDehydratedDevice(data);
        case "enable_key_backup":
            return enableKeyBackup(data);

        // Room
        case 'create_room':
            return createRoom(data);
        case 'create_dm':
            return createDm(data);
        case "change_room_history_visibility":
            return changeRoomHistoryVisibility(data);
        case "open-room":
            return openRoom(data);
        case "accept_invite":
            return acceptInvite();
        case "invite_user":
            return inviteUser(data);

        // Timeline
        case 'send_message':
            return sendMessage(data);
        case "verify_message_in_timeline":
            return verifyMessageInTimeline(data);
        case "verify_last_message_is_utd":
            return verifyLastMessageIsUTD();
        case "verify_last_message_is_trusted":
            return verifyLastMessageIsTrusted();

        // Browser
        case 'idle':
            idle();
            break;
        case 'wait':
            return wait(data);
        case "advance_clock":
            return advanceClock(data);
        case "clear_idb_storage":
            return clearIDBStorage();
        case "reload":
            return reload();
        case 'exit':
            exit();
            break;

        default:
            cy.log('WARNING: unknown action ', action);
            break;
    }
}
