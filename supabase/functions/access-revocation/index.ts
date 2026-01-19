/// <reference types="https://deno.land/x/types/index.d.ts" />
// @ts-ignore - Deno types are provided by Supabase Edge Functions runtime
import { corsHeaders, createSupabaseClient } from "../shared/supabase.ts";
import { registry } from "../shared/connectors.ts";

interface RevocationRequest {
    employee_id: string;
    company_id: string;
    connector_ids: string[];
}

// @ts-ignore - Deno global is available in Supabase Edge Functions runtime
Deno.serve(async (req: Request) => {
    // 1. Handle CORS Preflight
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

        const { employee_id, company_id, connector_ids }: RevocationRequest = await req.json();

        const supabase = createSupabaseClient();

        // Fetch Employee
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('email, full_name')
            .eq('id', employee_id)
            .single();

        if (empError) {
            return new Response(JSON.stringify({ error: empError.message }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const results = [];

        for (const cid of (connector_ids || [])) {
            const connector = registry[cid];
            if (connector) {
                const result = await connector.revokeAccess(employee.email);

                await supabase.from('audit_logs').insert({
                    company_id,
                    actor_id: 'system_bot',
                    action: `access_revoked_${cid}`,
                    entity_type: 'employee',
                    entity_id: employee_id,
                    metadata: result.proof
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
