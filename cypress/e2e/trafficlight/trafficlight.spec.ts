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

type JSONValue =
    | string
    | number
    | boolean
    | { [x: string]: JSONValue }
    | Array<JSONValue>;

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
        case 'register':
            cy.visit('/#/register');
            cy.get('.mx_ServerPicker_change', { timeout: 15000 }).click();
            cy.get('.mx_ServerPickerDialog_continue').should('be.visible');
            cy.get('.mx_ServerPickerDialog_otherHomeserver').type(data['homeserver_url']['local']);
            cy.get('.mx_ServerPickerDialog_continue').click();
            // wait for the dialog to go away
            cy.get('.mx_ServerPickerDialog').should('not.exist');
            cy.get('#mx_RegistrationForm_username').should('be.visible');
            // Hide the server text as it contains the randomly allocated Synapse port
            cy.get('#mx_RegistrationForm_username').type(data['username']);
            cy.get('#mx_RegistrationForm_password').type(data['password']);
            cy.get('#mx_RegistrationForm_passwordConfirm').type(data['password']);
            cy.get('.mx_Login_submit').click();
            cy.get('.mx_UseCaseSelection_skip > .mx_AccessibleButton').click();
            return 'registered';
        case 'login':
            cy.visit('/#/login');
            cy.get('#mx_LoginForm_username', { timeout: 15000 }).should('be.visible');
            cy.get('.mx_ServerPicker_change').click();
            cy.get('.mx_ServerPickerDialog_otherHomeserver').type(data['homeserver_url']['local']);
            cy.get('.mx_ServerPickerDialog_continue').click();
            // wait for the dialog to go away
            cy.get('.mx_ServerPickerDialog').should('not.exist');
            cy.get('#mx_LoginForm_username').type(data['username']);
            cy.get('#mx_LoginForm_password').type(data['password']);
            cy.get('.mx_Login_submit').click();
            return 'loggedin';
        case 'start_crosssign':
            cy.get('.mx_CompleteSecurity_actionRow > .mx_AccessibleButton').click();
            return 'started_crosssign';
        case 'accept_crosssign':
            // Can we please tag some buttons :)
            // Click 'Verify' when it comes up
            cy.get('.mx_Toast_buttons > .mx_AccessibleButton_kind_primary').click();
            // Click to move to emoji verification
            cy.get('.mx_VerificationPanel_QRPhase_startOption > .mx_AccessibleButton').click();
            return 'accepted_crosssign';
        case 'verify_crosssign_emoji':
            cy.get('.mx_VerificationShowSas_buttonRow > .mx_AccessibleButton_kind_primary').click();
            cy.get('.mx_UserInfo_container > .mx_AccessibleButton').click();
            return 'verified_crosssign';
        case 'idle':
            cy.wait(5000);
            break;
        case 'create_room':
            cy.get('.mx_RoomListHeader_plusButton').click();
            cy.get('.mx_ContextualMenu').contains('New room').click();
            cy.get('.mx_CreateRoomDialog_name input').type(data['name']);
            if (data['topic']) {
                cy.get('.mx_CreateRoomDialog_topic input').type(data['topic']);
            }
            // do this to prevent https://github.com/vector-im/element-web/issues/22590, weirdly
            // cy.get('.mx_CreateRoomDialog_name input').click();
            // cy.wait(5000);

            cy.get('.mx_Dialog_primary').click();
            //cy.get('.mx_RoomHeader_nametext').should('contain', data['name']);
            return "room_created";
        case 'send_message':
            cy.get('.mx_SendMessageComposer div[contenteditable=true]')
                .click()
                .type(data['message'])
                .type("{enter}");
            //cy.contains(data['message']).closest('mx_EventTile').should('have.class', 'mx_EventTile_receiptSent');
            return "message_sent";
        case "change_room_history_visibility":
            cy.get(".mx_RightPanel_roomSummaryButton").click();
            cy.get(".mx_RoomSummaryCard_icon_settings").click();
            cy.get(`[data-testid='settings-tab-ROOM_SECURITY_TAB']`).click();
            // should be either "shared", "invited" or "joined"
            // TODO: has doesn't seem to work
            cy.get(`#historyVis-${data['historyVisibility']}`).parents("label").click();
            cy.get(".mx_Dialog_cancelButton").click();
            cy.get("[data-test-id=base-card-close-button]").click();
            return "changed";
        case "invite_user": {
            cy.get(".mx_RightPanel_roomSummaryButton").click();
            cy.get(".mx_RoomSummaryCard_icon_people").click();
            cy.get(".mx_MemberList_invite").click();
            cy.get(".mx_InviteDialog_addressBar input")
                .type(`@${data["userId"]}`)
                .type("{enter}");
            cy.get(".mx_InviteDialog_goButton").click();
            return "invited";
        }
        case "accept_invite":
            cy.get(".mx_RoomTile").click();
            cy.get(".mx_RoomPreviewBar_actions .mx_AccessibleButton_kind_primary").click();
            return "accepted";
        case "verify_message_in_timeline":
            cy.contains(data["message"]);
            return "verified";
        case 'exit':
            cy.log('Client asked to exit, test complete or server teardown');
            return;
        default:
            cy.log('WARNING: unknown action ', action);
            return;
    }
}