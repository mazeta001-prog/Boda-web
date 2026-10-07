import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oxiubezpkxqxnhqvpmvf.supabase.co';
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_AnCnhh5HWOnheVLelqjCRA_D5RAmRPl';

console.log('🔍 Comprobando conexión con Supabase...');
console.log(`📡 URL: ${SUPABASE_URL}`);

const client = createClient(SUPABASE_URL, PUBLISHABLE_KEY);

async function check() {
  try {
    const { count: guestsCount, error: guestsErr } = await client
      .from('guests')
      .select('*', { count: 'exact', head: true });

    if (guestsErr) {
      console.error('❌ Error al conectar con Supabase:', guestsErr.message);
      process.exit(1);
    }

    console.log(`✅ Conexión con Supabase exitosa.`);
    console.log(`📋 Total de invitados registrados: ${guestsCount}`);

    const { count: eventsCount } = await client
      .from('events')
      .select('*', { count: 'exact', head: true });
    console.log(`📅 Total de eventos: ${eventsCount}`);

    const { count: tablesCount } = await client
      .from('tables')
      .select('*', { count: 'exact', head: true });
    console.log(`🍽️ Total de mesas configuradas: ${tablesCount}`);

    console.log('\n🎉 ¡El proyecto está conectado y operando con normalidad!');
  } catch (err) {
    console.error('❌ Error inesperado:', err);
    process.exit(1);
  }
}

check();
