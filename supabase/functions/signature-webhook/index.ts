import { corsHeaders, createSupabaseClient } from "../shared/supabase.ts";

interface SignaturePayload {
    signature_id: string;
    status: string;
    signed_at?: string;
}

Deno.serve(async (req) => {
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

        const { signature_id, status, signed_at }: SignaturePayload = await req.json();

        const supabase = createSupabaseClient();

        // 1. Update document status
        const { data: doc, error: docError } = await supabase
            .from('documents')
            .update({
                status: status === 'completed' ? 'signed' : 'declined',
                signed_at: signed_at || new Date().toISOString()
            })
            .eq('external_signature_id', signature_id)
            .select()
            .single();

        if (docError || !doc) {
            return new Response(JSON.stringify({ error: docError?.message || "Document not found" }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 2. Audit the signature completion
        await supabase.from('audit_logs').insert({
            company_id: doc.company_id,
            actor_id: 'external_signature_service',
            action: `document_${status}`,
            entity_type: 'document',
            entity_id: doc.id,
            metadata: { signature_id, status }
        });

        // 3. If signed, mark a related task as complete
        if (status === 'completed') {
            const { data: task } = await supabase
                .from('tasks')
                .select('id')
                .eq('case_id', doc.case_id)
                .ilike('title', `%Sign%${doc.title}%`)
                .limit(1)
                .single();

            if (task) {
                await supabase.from('tasks').update({
                    status: 'completed',
                    completed_at: new Date().toISOString()
                }).eq('id', task.id);
            }
        }

        return new Response(JSON.stringify({ message: "Signature Status Synchronized" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
