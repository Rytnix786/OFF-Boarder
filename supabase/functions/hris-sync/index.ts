/// <reference types="https://deno.land/x/types/index.d.ts" />
// @ts-ignore - Deno types are provided by Supabase Edge Functions runtime
import { corsHeaders, createSupabaseClient } from "../shared/supabase.ts";

interface HRISRequest {
    employee_id: string;
    company_id: string;
    new_status: 'active' | 'offboarding' | 'terminated';
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

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
