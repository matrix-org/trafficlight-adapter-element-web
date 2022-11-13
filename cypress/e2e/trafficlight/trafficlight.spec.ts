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

import { login, logout, register } from "./actions/auth";
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

type JSONValue =
    | string
    | number
    | boolean
    | { [x: string]: JSONValue }
    | Array<JSONValue>;

Cypress.on('uncaught:exception', (err, runnable) => {
    return false;
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
        const result = runAction(action, data);
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

        case 'idle':
            cy.wait(5000);
            break;
        case 'send_message':
            cy.get('.mx_SendMessageComposer div[contenteditable=true]')
                .click()
                .type(data['message'])
                .type("{enter}");
            //cy.contains(data['message']).closest('mx_EventTile').should('have.class', 'mx_EventTile_receiptSent');
            return "message_sent";
        case "verify_message_in_timeline":
            cy.contains(data["message"]);
            return "verified";
        case 'wait': {
            const time = data["time"]? parseInt(data["time"], 10): 5000;
            cy.wait(time);
            return "wait_over";
        }
        case "advance_clock": {
            cy.clock().tick(data["milliseconds"]);
            return "advanced_clock";
        }
        case "verify_last_message_is_utd":
            // verifies that the last tile is an UTD
            cy.get(".mx_EventTile").then((elements) => {
                const lastEventTile = Array.isArray(elements) ? elements[elements.length - 1] : elements;
                cy.get(".mx_UnknownBody", { withinSubject: lastEventTile });
            });
            cy.get(".mx_UnknownBody");
            return "verified";
        case "verify_last_message_is_trusted": {
            cy.get(".mx_EventTile")
                .last()
                .find(".mx_EventTile_e2eIcon").should("not.exist");
            return "verified";
        }
        case "clear_idb_storage":
            cy.window().then((window) => {
                return window.indexedDB.databases().then(databases => {
                    const databaseNames: string[] = databases
                        .map((db) => db.name)
                        .filter((name) => name !== undefined) as string[];
                    for (const name of databaseNames) {
                        cy.log("Deleting indexedDb database", name);
                        window.indexedDB.deleteDatabase(name);
                    }
                });
            });
            return "storage_cleared";
        case "reload":
            cy.visit("/");
            // cy.reload();
            return "reloaded";
        case 'exit':
            cy.log('Client asked to exit, test complete or server teardown');
            return;
        default:
            cy.log('WARNING: unknown action ', action);
            return;
    }
}
