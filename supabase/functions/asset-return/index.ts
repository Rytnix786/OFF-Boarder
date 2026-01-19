/// <reference types="https://deno.land/x/types/index.d.ts" />
// @ts-ignore - Deno types are provided by Supabase Edge Functions runtime
import { corsHeaders, createSupabaseClient } from "../shared/supabase.ts";

interface ReturnRequest {
    assetReturnId: string;
    organizationId: string;
    condition: string;
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

        const { assetReturnId, organizationId, condition }: ReturnRequest = await req.json();

        const supabase = createSupabaseClient();

        const { data: assetReturn, error: returnError } = await supabase
            .from('AssetReturn')
            .update({
                returnedAt: new Date().toISOString(),
                condition: condition,
                status: 'RETURNED'
            })
            .eq('id', assetReturnId)
            .select('*, asset:Asset(*)')
            .single();

        if (returnError || !assetReturn) {
            return new Response(JSON.stringify({ error: returnError?.message || "Asset return not found" }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        await supabase.from('AuditLog').insert({
            organizationId,
            userId: null,
            action: 'asset_returned',
            entityType: 'Asset',
            entityId: assetReturn.assetId,
            metadata: {
                assetReturnId,
                condition,
                assetName: assetReturn.asset?.name,
                serialNumber: assetReturn.asset?.serialNumber
            },
            scope: 'ORGANIZATION'
        });

        await supabase.from('Notification').insert({
            userId: '',
            organizationId,
            type: 'ASSET_RETURNED',
            title: 'Asset Returned',
            message: `Asset ${assetReturn.asset?.name} (${assetReturn.asset?.serialNumber}) has been returned in ${condition} condition.`,
            read: false
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
