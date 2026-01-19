/// <reference types="https://deno.land/x/types/index.d.ts" />
// @ts-ignore - Deno types are provided by Supabase Edge Functions runtime
import { corsHeaders, createSupabaseClient } from "../shared/supabase.ts";

interface ReturnRequest {
    assignment_id: string;
    company_id: string;
    condition: string;
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

        const { assignment_id, company_id, condition }: ReturnRequest = await req.json();

        const supabase = createSupabaseClient();

        // 1. Mark assignment as returned
        const { data: assignment, error: assignError } = await supabase
            .from('asset_assignments')
            .update({
                returned_at: new Date().toISOString(),
                condition_on_return: condition
            })
            .eq('id', assignment_id)
            .eq('company_id', company_id)
            .select()
            .single();

        if (assignError || !assignment) {
            return new Response(JSON.stringify({ error: assignError?.message || "Assignment not found" }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 2. Fetch specific asset info for the log
        const { data: asset } = await supabase
            .from('assets')
            .select('name, serial_number')
            .eq('id', assignment.asset_id)
            .single();

        // 3. Log to Audit Table (Automation)
        await supabase.from('audit_logs').insert({
            company_id,
            actor_id: 'system_bot',
            action: 'asset_returned',
            entity_type: 'asset',
            entity_id: assignment.asset_id,
            metadata: {
                assignment_id,
                condition,
                asset_name: asset?.name,
                serial: asset?.serial_number
            }
        });

        // 4. Queue Notification for HR/IT
        await supabase.from('notifications').insert({
            company_id,
            title: 'Asset Returned',
            content: `Asset ${asset?.name} (${asset?.serial_number}) has been returned in ${condition} condition.`,
            status: 'unread'
        });

        return new Response(JSON.stringify({ message: "Asset Return Processed" }), {
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
