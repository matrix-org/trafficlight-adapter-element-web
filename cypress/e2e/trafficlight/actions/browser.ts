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

export function idle(): void {
    cy.wait(5000);
}

export function advanceClock(milliseconds: string): string {
    const millisecondsAsNumber = parseInt(milliseconds, 10);
    if (isNaN(millisecondsAsNumber)) {
        throw new Error(`Cannot convert ${milliseconds} to integer!`);
    }
    cy.clock().tick(millisecondsAsNumber);
    return "advanced_clock";
}

export function clearIDBStorage(): string {
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
    cy.wait(5000);
    return "storage_cleared";
}

export function exit(): void {
    cy.log('Client asked to exit, test complete or server teardown');
}

export function reload(): string {
    cy.visit("/");
    return "reloaded";
}
