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
        case 'register':
            cy.visit('/#/register');
            cy.get('.mx_ServerPicker_change').click();
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
            cy.get('#mx_LoginForm_username').should('be.visible');
            cy.get('.mx_ServerPicker_change').click();
            cy.get('.mx_ServerPickerDialog_otherHomeserver').clear().type(data['homeserver_url']['local']);
            cy.get('.mx_ServerPickerDialog_continue').click();
            // wait for the dialog to go away
            cy.get('.mx_ServerPickerDialog').should('not.exist');
            cy.get('#mx_LoginForm_username').type(data['username']);
            cy.get('#mx_LoginForm_password').type(data['password']);
            cy.get('.mx_Login_submit').click();
            // Try to restore from key backup if needed
            if (data["key_backup_passphrase"]) {
                cy.log("Restoring from keybackup ...");
                cy.get(".mx_CompleteSecurity_actionRow .mx_AccessibleButton_kind_primary").last().click();
                cy.get("#mx_passPhraseInput").clear().type(data["key_backup_passphrase"]);
                cy.get(".mx_AccessSecretStorageDialog_primaryContainer [data-testid='dialog-primary-button']").click();
                cy.get(".mx_CompleteSecurity_actionRow .mx_AccessibleButton_kind_primary").click();
            } else {
                cy.log("Skipping security popup ...");
                cy.wait(3000).then(() => {
                    Cypress.$(".mx_CompleteSecurity_skip")?.first()?.trigger("click");
                    Cypress.$(".mx_AccessibleButton_kind_danger_outline")?.first()?.trigger("click");
                });
            }
            return 'loggedin';
        case "logout": {
            cy.get(".mx_UserMenu_userAvatar").click();
            cy.get(".mx_ContextualMenu").contains("Sign out").click().wait(100).then(() => {
                Cypress.$(".mx_QuestionDialog")
                    .find("[data-test-id='dialog-primary-button']")
                    ?.first()
                    ?.trigger("click");
            });
            return "logged_out";
        }
        case 'start_crosssign':
            if (data?.["userId"]) {
                cy.get(".mx_RightPanel_roomSummaryButton").click();
                cy.get(".mx_RoomSummaryCard_icon_people").click();
                cy.get(".mx_MemberList_query").type(data["userId"]);
                cy.get(".mx_MemberList_wrapper .mx_EntityTile").click();
                cy.get(".mx_UserInfo_verifyButton").click();
                cy.get(".mx_UserInfo_startVerification").click();
            } else {
                cy.gotoAllSettings();
                cy.get("[data-testid='settings-tab-USER_SECURITY_TAB']").click();
                cy.contains("Verify").first().click();
                cy.contains("Verify with another device").click();
            }
            return 'started_crosssign';
        case 'accept_crosssign':
            // Can we please tag some buttons :)
            // Click 'Verify' when it comes up
            cy.get('.mx_Toast_buttons > .mx_AccessibleButton_kind_primary').click();
            // Click to move to emoji verification
            cy.wait(1000).then(() => {
                // Choose whichever exists
                Cypress.$(".mx_VerificationPanel_verifyByEmojiButton")?.trigger("click");
                Cypress.$('.mx_VerificationPanel_QRPhase_startOption > .mx_AccessibleButton')?.trigger("click");
            });
            return 'accepted_crosssign';
        case 'verify_crosssign_emoji':
            cy.get('.mx_VerificationShowSas_buttonRow > .mx_AccessibleButton_kind_primary').click();
            cy.get('.mx_UserInfo_container > .mx_AccessibleButton').click();
            return 'verified_crosssign';
        case "verify_trusted_device":
            cy.gotoAllSettings();
            cy.get("[data-testid='settings-tab-USER_SECURITY_TAB']").click();
            // For now, we only care if there are any verified devices
            cy.contains(/^Verified devices$/);
            cy.get(".mx_DevicesPanel_device").children();
            return "verified";
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
        case 'create_dm':
            cy.get('.mx_RoomListHeader_plusButton').click();
            cy.get('.mx_ContextualMenu').contains('Start new chat').click();
            cy.get('[data-testid="invite-dialog-input"]').type(`@${data["userId"]}`);
            cy.get('.mx_InviteDialog_goButton').click();
            return "dm_created";
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
        case "enable_dehydrated_device": {
            cy.gotoAllSettings();
            cy.get("[data-testid='settings-tab-USER_LABS_TAB']").click();
            cy.get("[aria-label='Offline encrypted messaging using dehydrated devices']").click();
            cy.get(".mx_Dialog_cancelButton").click();
            runAction("enable_key_backup", data);
            return "enabled_dehydrated_device";
        }
        case "enable_key_backup": {
            cy.gotoAllSettings();
            cy.get("[data-testid='settings-tab-USER_SECURITY_TAB']").click();
            cy.get(".mx_SecureBackupPanel_buttonRow").contains("Set up").click();
            cy.get(".mx_CreateSecretStorageDialog_optionIcon_securePhrase").click();
            cy.get(".mx_CreateSecretStorageDialog [data-testid='dialog-primary-button']").click();
            const password = data["key_backup_passphrase"];
            if (!password) {
                throw new Error("'key_backup_passphrase' not in data for action 'enable_dehydrated_device'");
            }
            cy.get(".mx_CreateSecretStorageDialog_passPhraseContainer input[type='password']").type(password);
            cy.get("[data-testid='dialog-primary-button']").click();
            // confirm the password again
            cy.get(".mx_CreateSecretStorageDialog_passPhraseContainer input[type='password']").type(password);
            cy.get("[data-testid='dialog-primary-button']").click();
            // Continue to next screen
            cy.get("[data-testid='dialog-primary-button']").click();
            // Classic flakiness fix
            cy.wait(500);
            cy.get(".mx_CreateSecretStorageDialog").contains("Continue").click();
            return "key_backup_enabled";
        }
        case "invite_user": {
            cy.get(".mx_RightPanel_roomSummaryButton").click();
            cy.get(".mx_RoomSummaryCard_icon_people").click();
            cy.get(".mx_MemberList_invite").click();
            cy.get(".mx_InviteDialog_addressBar input")
                .type(`@${data["userId"]}`)
                .type("{enter}");
            cy.get(".mx_InviteDialog_goButton").click();
            cy.get(".mx_AccessibleButton.mx_BaseCard_back").click();
            cy.get(".mx_AccessibleButton.mx_BaseCard_close", { timeout: 30000 }).click();
            return "invited";
        }
        case "open-room": {
            cy.get(".mx_RoomSublist_tiles").contains(data["name"]).click();
            return "room-opened";
        }
        case "accept_invite":
            cy.get(".mx_RoomTile").click();
            cy.get(".mx_RoomPreviewBar_actions .mx_AccessibleButton_kind_primary").click();
            return "accepted";
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
            cy.reload();
            return "reloaded";
        case 'exit':
            cy.log('Client asked to exit, test complete or server teardown');
            return;
        default:
            throw new Error(`WARNING: unknown action "${action}"`);
    }
}
