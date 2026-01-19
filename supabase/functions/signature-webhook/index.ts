/// <reference types="https://deno.land/x/types/index.d.ts" />
// @ts-ignore - Deno types are provided by Supabase Edge Functions runtime
import { corsHeaders, createSupabaseClient } from "../shared/supabase.ts";

interface SignaturePayload {
    signatureId: string;
    status: string;
    signedAt?: string;
    offboardingId: string;
    organizationId: string;
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

        const { signatureId, status, signedAt, offboardingId, organizationId }: SignaturePayload = await req.json();

        const supabase = createSupabaseClient();

        await supabase.from('AuditLog').insert({
            organizationId,
            userId: null,
            action: `document_${status}`,
            entityType: 'Offboarding',
            entityId: offboardingId,
            metadata: { signatureId, status, signedAt },
            scope: 'ORGANIZATION'
        });

        if (status === 'completed') {
            const { data: task } = await supabase
                .from('OffboardingTask')
                .select('id')
                .eq('offboardingId', offboardingId)
                .ilike('name', '%Sign%')
                .limit(1)
                .single();

            if (task) {
                await supabase.from('OffboardingTask').update({
                    status: 'COMPLETED',
                    completedAt: new Date().toISOString()
                }).eq('id', task.id);
            }
        }

        return new Response(JSON.stringify({ message: "Signature Status Synchronized" }), {
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
