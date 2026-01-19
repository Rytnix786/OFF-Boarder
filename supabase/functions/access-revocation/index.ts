/// <reference types="https://deno.land/x/types/index.d.ts" />
// @ts-ignore - Deno types are provided by Supabase Edge Functions runtime
import { corsHeaders, createSupabaseClient } from "../shared/supabase.ts";
import { registry } from "../shared/connectors.ts";

interface RevocationRequest {
    employeeId: string;
    organizationId: string;
    connectorIds: string[];
}

// @ts-ignore - Deno global is available in Supabase Edge Functions runtime
Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        if (req.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
                status: 405,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const { employeeId, organizationId, connectorIds }: RevocationRequest = await req.json();

        const supabase = createSupabaseClient();

        const { data: employee, error: empError } = await supabase
            .from('Employee')
            .select('email, firstName, lastName')
            .eq('id', employeeId)
            .single();

        if (empError) {
            return new Response(JSON.stringify({ error: empError.message }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const results = [];

        for (const cid of (connectorIds || [])) {
            const connector = registry[cid];
            if (connector) {
                const result = await connector.revokeAccess(employee.email);

                await supabase.from('AuditLog').insert({
                    organizationId,
                    userId: null,
                    action: `access_revoked_${cid}`,
                    entityType: 'Employee',
                    entityId: employeeId,
                    metadata: result.proof,
                    scope: 'ORGANIZATION'
                });

                results.push({ connector: cid, ...result });
            }
        }

        return new Response(JSON.stringify({
            message: "Revocation Process Completed",
            results
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
