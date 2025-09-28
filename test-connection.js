// Test Supabase connection and basic operations
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dfvjggwdwodlcrdmcaht.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmdmpnZ3dkd29kbGNyZG1jYWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjM0ODgsImV4cCI6MjA3NDI5OTQ4OH0.Mhho-FA1TMEwvEMvyGP1sRl0nbNsgqGNDLg9-YjHkRY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test 1: Check if we can connect
    const { data, error } = await supabase.from('schools').select('count');
    if (error) {
      console.error('Connection test failed:', error);
      return;
    }
    console.log('✅ Connection successful');
    
    // Test 2: Check if admin user exists
    const { data: adminUser, error: adminError } = await supabase
      .from('app_users')
      .select('*')
      .eq('email', 'Bedaya.sdn@gmail.com')
      .single();
      
    if (adminError) {
      console.error('❌ Admin user not found:', adminError);
    } else {
      console.log('✅ Admin user exists:', adminUser.name);
    }
    
    // Test 3: Try creating a test school
    const { data: newSchool, error: schoolError } = await supabase
      .from('schools')
      .insert({ name: 'Test School ' + Date.now(), description: 'Test description' })
      .select()
      .single();
      
    if (schoolError) {
      console.error('❌ School creation failed:', schoolError);
    } else {
      console.log('✅ School created successfully:', newSchool.name);
    }
    
    // Test 4: List all schools
    const { data: schools, error: listError } = await supabase
      .from('schools')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (listError) {
      console.error('❌ Failed to list schools:', listError);
    } else {
      console.log('✅ Schools found:', schools.length);
      schools.forEach(school => {
        console.log(`  - ${school.name} (${school.id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testConnection();