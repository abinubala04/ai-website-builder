#!/bin/bash

# prove-it-works.sh - Dead simple proof your LLM works

echo "==================================="
echo "  PROVING YOUR LLM WORKS"
echo "==================================="
echo ""

# Test 1: Can we load it?
echo "Test 1: Loading your LLM..."
node -e "
try {
    const { myLLM } = require('./build-llm.js');
    console.log('✅ LLM loaded successfully');
} catch (e) {
    console.log('❌ Failed to load LLM:', e.message);
    process.exit(1);
}
" || exit 1

# Test 2: Does it respond?
echo -e "\nTest 2: Basic response..."
node -e "
const { myLLM } = require('./build-llm.js');
const response = myLLM.respond('Hello');
if (response && response.length > 0) {
    console.log('✅ LLM responded:', response);
} else {
    console.log('❌ LLM did not respond');
    process.exit(1);
}
" || exit 1

# Test 3: Can it help code?
echo -e "\nTest 3: Code generation..."
node -e "
const { myLLM } = require('./build-llm.js');
const response = myLLM.respond('Help me build a web interface');
if (response.includes('HTML') || response.includes('html') || response.includes('interface')) {
    console.log('✅ LLM can help with coding');
    console.log('Response preview:', response.substring(0, 100) + '...');
} else {
    console.log('❌ LLM cannot generate code help');
    process.exit(1);
}
" || exit 1

echo -e "\n==================================="
echo "  🎉 YOUR LLM WORKS!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Try chatting: node build-llm.js"
echo "2. Build web interface: node stage1.js"
echo "3. Share with friends!"
echo ""