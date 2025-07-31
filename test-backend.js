// Quick test to verify backend is working
const fetch = require('node-fetch');

async function testBackend() {
  try {
    console.log('🔍 Testing backend connection...');
    
    // Test health endpoint
    const healthResponse = await fetch('http://localhost:3001/api/health');
    console.log('✅ Health endpoint status:', healthResponse.status);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health response:', healthData);
    }
    
    // Test login endpoint with a test user
    console.log('\n🔍 Testing login endpoint...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'sebastiansilva@berkeley.edu',
        password: 'your_password_here' // Replace with actual password
      })
    });
    
    console.log('✅ Login endpoint status:', loginResponse.status);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login response structure:', {
        success: loginData.success,
        hasUser: !!loginData.data?.user,
        hasAccessToken: !!loginData.data?.accessToken,
        hasRefreshToken: !!loginData.data?.refreshToken,
        accessTokenLength: loginData.data?.accessToken?.length || 0,
        refreshTokenLength: loginData.data?.refreshToken?.length || 0
      });
    } else {
      const errorData = await loginResponse.json();
      console.log('❌ Login error:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
  }
}

testBackend();