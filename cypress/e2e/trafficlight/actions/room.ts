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

/// <reference types='cypress' />

export function createRoom(data: any): string {
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
}

export function createDm(data: any): string {
    cy.get('.mx_RoomListHeader_plusButton').click();
    cy.get('.mx_ContextualMenu').contains('Start new chat').click();
    cy.get('[data-testid="invite-dialog-input"]').type(`@${data["userId"]}`);
    cy.get('.mx_InviteDialog_goButton').click();
    return "dm_created";
}

export function changeRoomHistoryVisibility(data: any): string {
    cy.get(".mx_RightPanel_roomSummaryButton").click();
    cy.get(".mx_RoomSummaryCard_icon_settings").click();
    cy.get(`[data-testid='settings-tab-ROOM_SECURITY_TAB']`).click();
    // should be either "shared", "invited" or "joined"
    // TODO: has doesn't seem to work
    cy.get(`#historyVis-${data['historyVisibility']}`).parents("label").click();
    cy.get(".mx_Dialog_cancelButton").click();
    cy.get("[data-test-id=base-card-close-button]").click();
    return "changed";
}

export function openRoom(data: any): string {
    cy.get(".mx_RoomSublist_tiles").contains(data["name"]).click();
    return "room_opened";
}

export function acceptInvite(): string {
    cy.get(".mx_RoomTile").click();
    cy.get(".mx_RoomPreviewBar_actions .mx_AccessibleButton_kind_primary").click();
    return "accepted";
}

export function inviteUser(data: any): string {
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
