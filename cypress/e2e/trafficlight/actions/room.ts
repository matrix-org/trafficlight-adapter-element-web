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

export async function createRoom(name: string, topic: string): Promise<string> {
    cy.get('.mx_RoomListHeader_plusButton').click({ force: true });
    cy.get('.mx_ContextualMenu').contains('New room').click();
    cy.get('.mx_CreateRoomDialog_name input').type(name);
    if (topic) {
        cy.get('.mx_CreateRoomDialog_topic input').type(topic);
    }
    cy.get('.mx_Dialog_primary').click();
    return await getRoomIdFromName(name);
}

function getRoomIdFromName(name: string): Promise<string> {
    let resolve;
    const promise: Promise<string> = new Promise(r => resolve = r);
    openRoom(name);
    cy.get(".mx_RightPanel_roomSummaryButton").click();
    cy.get(".mx_RoomSummaryCard_icon_settings").click();
    cy.get(`[data-testid='settings-tab-ROOM_ADVANCED_TAB']`).click();
    cy.get(".mx_CopyableText").invoke("text").then(roomId => {
        cy.get(".mx_Dialog_cancelButton").click();
        cy.get("[data-test-id=base-card-close-button]").click();
        resolve(roomId);
    });
    return promise;
}

export function createDm(userId: string): string {
    cy.get('.mx_RoomListHeader_plusButton').click();
    cy.get('.mx_ContextualMenu').contains('Start new chat').click();
    cy.get('[data-testid="invite-dialog-input"]').type(`@${userId}`);
    cy.get('.mx_InviteDialog_goButton').click();
    return "dm_created";
}

export function changeRoomHistoryVisibility(historyVisibility: string): string {
    cy.get(".mx_RightPanel_roomSummaryButton").click();
    cy.get(".mx_RoomSummaryCard_icon_settings").click();
    cy.get(`[data-testid='settings-tab-ROOM_SECURITY_TAB']`).click();
    // should be either "shared", "invited" or "joined"
    cy.get(`#historyVis-${historyVisibility}`).parents("label").click();
    cy.get(".mx_Dialog_cancelButton").click();
    cy.get("[data-test-id=base-card-close-button]").click();
    return "changed";
}

export function openRoom(name: string): string {
    cy.get(".mx_RoomSublist_tiles").contains(name).click();
    return "room_opened";
}

export function acceptInvite(): string {
    cy.get(".mx_RoomTile").click();
    cy.get(".mx_RoomPreviewBar_actions .mx_AccessibleButton_kind_primary").click();
    return "accepted";
}

export function inviteUser(userId: string): string {
    cy.get(".mx_RightPanel_roomSummaryButton").click();
    cy.get(".mx_RoomSummaryCard_icon_people").click();
    cy.get(".mx_MemberList_invite").click();
    cy.get(".mx_InviteDialog_addressBar input")
        .type(`@${userId}`)
        .type("{enter}");
    cy.get(".mx_InviteDialog_goButton").click();
    cy.get(".mx_AccessibleButton.mx_BaseCard_back").click();
    cy.get(".mx_AccessibleButton.mx_BaseCard_close", { timeout: 30000 }).click();
    return "invited";
}
