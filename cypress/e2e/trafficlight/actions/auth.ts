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

export function register(data: any): string {
    cy.visit("/#/register");
    cy.get(".mx_ServerPicker_change").click();
    cy.get(".mx_ServerPickerDialog_continue").should("be.visible");
    cy.get(".mx_ServerPickerDialog_otherHomeserver").type(
        data["homeserver_url"]["local"],
    );
    cy.get(".mx_ServerPickerDialog_continue").click();
    // wait for the dialog to go away
    cy.get(".mx_ServerPickerDialog").should("not.exist");
    cy.get("#mx_RegistrationForm_username").should("be.visible");
    // Hide the server text as it contains the randomly allocated Synapse port
    cy.get("#mx_RegistrationForm_username").type(data["username"]);
    cy.get("#mx_RegistrationForm_password").type(data["password"]);
    cy.get("#mx_RegistrationForm_passwordConfirm").type(data["password"]);
    cy.get(".mx_Login_submit").click();
    cy.get(".mx_UseCaseSelection_skip > .mx_AccessibleButton").click();
    return "registered";
}

export function login(data: any): string {
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
}

export function logout(): string {
    cy.get(".mx_UserMenu_userAvatar").click();
    cy.get(".mx_ContextualMenu")
        .contains("Sign out")
        .click()
        .wait(100)
        .then(() => {
            Cypress.$(".mx_QuestionDialog")
                .find("[data-test-id='dialog-primary-button']")
                ?.first()
                ?.trigger("click");
        });
    cy.wait(2000).then(() => {
        Cypress.$(".mx_ErrorDialog .mx_Dialog_primary")?.first().trigger("click");
    });
    return "logged_out";
}
