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

export function startCrossSigning(userId: string): string {
    if (userId) {
        cy.get(".mx_RightPanel_roomSummaryButton").click();
        cy.get(".mx_RoomSummaryCard_icon_people").click();
        cy.get(".mx_MemberList_query").type(userId);
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
}

export function acceptCrossSigningRequest(): string {
    // Can we please tag some buttons :)
    // Click 'Verify' when it comes up
    cy.get('.mx_Toast_buttons > .mx_AccessibleButton_kind_primary').click();
    return 'accepted_crosssign';
}

export function verifyCrossSigningEmoji(): string {
    // Click to move to emoji verification
    cy.wait(1000).then(() => {
        // Choose whichever exists
        Cypress.$(".mx_VerificationPanel_verifyByEmojiButton")?.trigger("click");
        Cypress.$('.mx_VerificationPanel_QRPhase_startOption > .mx_AccessibleButton')?.trigger("click");
    });
    cy.contains("They match").click();
    cy.contains("Got it").click();
    return 'verified_crosssign';
}

export function verifyDeviceIsTrusted(): string {
    cy.gotoAllSettings();
    cy.get("[data-testid='settings-tab-USER_SECURITY_TAB']").click();
    // For now, we only care if there are any verified devices
    // Eventually, we'd want to check if a device is verified by name
    cy.contains(/^Verified devices$/);
    cy.get(".mx_DevicesPanel_device").children();
    return "verified";
}

export function enableKeyBackup(passphrase: string): string {
    cy.gotoAllSettings();
    cy.get("[data-testid='settings-tab-USER_SECURITY_TAB']").click();
    cy.get(".mx_SecureBackupPanel_buttonRow").contains("Set up").click();
    cy.get(".mx_CreateSecretStorageDialog_optionIcon_securePhrase").click();
    cy.get(".mx_CreateSecretStorageDialog [data-testid='dialog-primary-button']").click();
    cy.get(".mx_CreateSecretStorageDialog_passPhraseContainer input[type='password']").type(passphrase);
    cy.get("[data-testid='dialog-primary-button']").click();
    // confirm the password again
    cy.get(".mx_CreateSecretStorageDialog_passPhraseContainer input[type='password']").type(passphrase);
    cy.get("[data-testid='dialog-primary-button']").click();
    // Continue to next screen
    cy.get("[data-testid='dialog-primary-button']").click();
    // Classic flakiness fix
    cy.wait(500);
    cy.get(".mx_CreateSecretStorageDialog").contains("Continue").click();
    // Wait for secrets to be completed and dismiss the confirmation screen
    cy.wait(500);
    cy.get(".mx_CreateSecretStorageDialog").contains("Done").click();
    return "key_backup_enabled";
}

export function enableDehydratedDevice(passphrase: string): string {
    cy.gotoAllSettings();
    cy.get("[data-testid='settings-tab-USER_LABS_TAB']").click();
    cy.get("[aria-label='Offline encrypted messaging using dehydrated devices']").click();
    cy.get(".mx_Dialog_cancelButton").click();
    enableKeyBackup(passphrase);
    return "enabled_dehydrated_device";
}
