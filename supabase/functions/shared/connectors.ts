// Shared logic for external integrations
export interface Connector {
    id: string;
    name: string;
    type: 'iam' | 'saas' | 'hris';
    revokeAccess(employeeEmail: string): Promise<{ success: boolean; proof: any }>;
}

export class OktaConnector implements Connector {
    id = 'okta';
    name = 'Okta IAM';
    type = 'iam' as const;

    async revokeAccess(employeeEmail: string) {
        console.log(`[Okta] Revoking access for ${employeeEmail}`);
        // Mock API call to Okta /v1/users/{id}/lifecycle/suspend
        return {
            success: true,
            proof: {
                action: 'user_suspended',
                timestamp: new Date().toISOString(),
                provider: 'okta'
            }
        };
    }
}

export class GitHubConnector implements Connector {
    id = 'github';
    name = 'GitHub Enterprise';
    type = 'saas' as const;

    async revokeAccess(employeeEmail: string) {
        console.log(`[GitHub] Removing ${employeeEmail} from organization`);
        return {
            success: true,
            proof: {
                action: 'membership_removed',
                timestamp: new Date().toISOString(),
                provider: 'github'
            }
        };
    }
}

export const registry: Record<string, Connector> = {
    okta: new OktaConnector(),
    github: new GitHubConnector(),
};
