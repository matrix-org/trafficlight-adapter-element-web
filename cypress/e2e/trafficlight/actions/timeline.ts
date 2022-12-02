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

export function sendMessage(message: string): string {
    cy.get(".mx_SendMessageComposer div[contenteditable=true]")
        .click()
        .type(message)
        .type("{enter}");
    //cy.contains(data['message']).closest('mx_EventTile').should('have.class', 'mx_EventTile_receiptSent');
    return "message_sent";
}

export function verifyMessageInTimeline(message: string): string {
    cy.contains(message);
    return "verified";
}

export function verifyLastMessageIsUTD(): string {
    // verifies that the last tile is an UTD
    cy.get(".mx_EventTile").then((elements) => {
        const lastEventTile = Array.isArray(elements) ? elements[elements.length - 1] : elements;
        cy.get(".mx_UnknownBody", { withinSubject: lastEventTile });
    });
    cy.get(".mx_UnknownBody");
    return "verified";
}

export function verifyLastMessageIsTrusted(): string {
    cy.get(".mx_EventTile")
        .last()
        .find(".mx_EventTile_e2eIcon").should("not.exist");
    return "verified";
}

export function getTimeline(): JSONValue {
    const rsp = [];
    Cypress.$('.mx_EventTile').each(
        function(index, obj) {
            tile = {};
            tile['user'] = Cypress.$(obj).find('.mx_BaseAvatar_image').attr('title');
            const e2eicon = Cypress.$(obj).find('.mx_EventTile_e2eIcon').attr('class');
            tile['e2e_issues'] = e2eicon;
            tile['message'] = Cypress.$(obj).find('.mx_EventTile_content').text();
            rsp.push(tile);
        },
    );
    return { "response": "got_timeline", "timeline": rsp };
}
