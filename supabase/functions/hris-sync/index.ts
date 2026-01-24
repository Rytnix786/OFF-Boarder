/// <reference lib="deno.ns" />

import { corsHeaders, createSupabaseClient } from "../shared/supabase.ts";

interface HRISRequest {
    employee_id: string;
    company_id: string;
    new_status: 'active' | 'offboarding' | 'terminated';
}

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

        const { employee_id, company_id, new_status }: HRISRequest = await req.json();

        const supabase = createSupabaseClient();

        const { data, error } = await supabase
            .from('employees')
            .update({ status: new_status })
            .eq('id', employee_id)
            .eq('company_id', company_id)
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

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
