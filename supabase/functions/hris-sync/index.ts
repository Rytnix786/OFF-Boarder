/// <reference types="https://deno.land/x/types/index.d.ts" />
// @ts-ignore - Deno types are provided by Supabase Edge Functions runtime
import { corsHeaders, createSupabaseClient } from "../shared/supabase.ts";

interface HRISRequest {
    employeeId: string;
    organizationId: string;
    newStatus: 'ACTIVE' | 'OFFBOARDING' | 'TERMINATED' | 'ON_LEAVE' | 'ARCHIVED';
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

        const { employeeId, organizationId, newStatus }: HRISRequest = await req.json();

        const supabase = createSupabaseClient();

        const { data, error } = await supabase
            .from('Employee')
            .update({ status: newStatus })
            .eq('id', employeeId)
            .eq('organizationId', organizationId)
            .select();

        if (error || !data || data.length === 0) {
            return new Response(JSON.stringify(error || { message: "Employee not found or no changes made" }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            message: "HRIS Sync Successful",
            employee: data[0]
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
