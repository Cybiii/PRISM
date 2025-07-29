#!/usr/bin/env tsx

import { SerialPort } from 'serialport';

async function detectArduino() {
  console.log('🔍 Scanning for Arduino devices...\n');
  
  try {
    const ports = await SerialPort.list();
    
    if (ports.length === 0) {
      console.log('❌ No serial ports found. Make sure Arduino is connected via USB.');
      return;
    }
    
    console.log('📋 Available Serial Ports:');
    console.log('=' .repeat(50));
    
    let arduinoFound = false;
    
    for (const port of ports) {
      const isArduino = port.manufacturer?.toLowerCase().includes('arduino') ||
                       port.manufacturer?.toLowerCase().includes('ch340') ||
                       port.manufacturer?.toLowerCase().includes('cp210') ||
                       port.vendorId === '2341' || // Arduino VID
                       port.productId === '0043' || // Arduino Uno PID
                       port.productId === '0001';   // Arduino Uno R3 PID
      
      if (isArduino) {
        console.log(`✅ ARDUINO FOUND: ${port.path}`);
        arduinoFound = true;
      } else {
        console.log(`ℹ️  Other device: ${port.path}`);
      }
      
      console.log(`   Manufacturer: ${port.manufacturer || 'Unknown'}`);
      console.log(`   Vendor ID: ${port.vendorId || 'Unknown'}`);
      console.log(`   Product ID: ${port.productId || 'Unknown'}`);
      console.log('');
    }
    
    if (arduinoFound) {
      console.log('🎉 Arduino detected! You can now connect to the PUMA backend.');
      
      // Find the Arduino port
      const arduinoPort = ports.find(port => 
        port.manufacturer?.toLowerCase().includes('arduino') ||
        port.manufacturer?.toLowerCase().includes('ch340') ||
        port.manufacturer?.toLowerCase().includes('cp210') ||
        port.vendorId === '2341'
      );
      
      if (arduinoPort) {
        console.log(`\n📌 Recommended configuration:`);
        console.log(`   ARDUINO_PORT=${arduinoPort.path}`);
        console.log(`   ARDUINO_BAUD_RATE=9600`);
        console.log(`   ARDUINO_AUTO_DETECT=true`);
        
        return arduinoPort.path;
      }
    } else {
      console.log('⚠️  No Arduino devices detected.');
      console.log('   Make sure your Arduino is:');
      console.log('   • Connected via USB cable');
      console.log('   • Powered on');
      console.log('   • Has the correct drivers installed');
    }
    
  } catch (error) {
    console.error('❌ Error scanning ports:', error);
  }
}

// Run if called directly
if (require.main === module) {
  detectArduino();
}

export { detectArduino }; 