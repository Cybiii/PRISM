#!/usr/bin/env tsx

import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

async function monitorSerial() {
  console.log('🔍 PUMA Serial Monitor - Listening to Arduino on COM12...\n');
  
  try {
    const port = new SerialPort({
      path: 'COM12',
      baudRate: 9600,
      autoOpen: false
    });

    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

    port.on('open', () => {
      console.log('✅ Connected to Arduino on COM12');
      console.log('📡 Raw data from Arduino:\n');
      console.log('=' .repeat(60));
    });

    parser.on('data', (data: string) => {
      const timestamp = new Date().toLocaleTimeString();
      const trimmed = data.trim();
      
      if (trimmed) {
        console.log(`[${timestamp}] "${trimmed}"`);
        
        // Try to parse as expected format
        if (trimmed.includes('PH:') && trimmed.includes('R:')) {
          console.log('  ✅ VALID PUMA format detected!');
        } else {
          console.log('  ⚠️  Not PUMA format - needs TCS34725 code upload');
        }
        console.log('');
      }
    });

    port.on('error', (error) => {
      console.error('❌ Serial error:', error.message);
    });

    port.on('close', () => {
      console.log('🔌 Serial connection closed');
    });

    // Open the port
    await new Promise<void>((resolve, reject) => {
      port.open((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Stopping serial monitor...');
      port.close(() => {
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  monitorSerial();
}

export { monitorSerial }; 