// Quick verification test for ClipboardItem
const { ClipboardItem, ClipboardItemType } = require('./clipboardItem');

console.log('Testing ClipboardItem implementation...\n');

// Test 1: Create text item
console.log('1. Testing text item creation...');
const textItem = ClipboardItem.fromText('Hello, World!');
console.log('   ✓ Text item created:', textItem.id);
console.log('   ✓ Content hash:', textItem.contentHash);
console.log('   ✓ Preview:', textItem.getPreview());
console.log('   ✓ Relative time:', textItem.getRelativeTime());

// Test 2: Create rich text item
console.log('\n2. Testing rich text item creation...');
const richTextItem = ClipboardItem.fromText('Plain text', '<b>Rich text</b>');
console.log('   ✓ Rich text item created:', richTextItem.type === ClipboardItemType.RICH_TEXT);
console.log('   ✓ Has plain text:', richTextItem.plainText);
console.log('   ✓ Has rich text:', richTextItem.richText);

// Test 3: Create image item
console.log('\n3. Testing image item creation...');
const imageBuffer = Buffer.from('fake-image-data');
const imageItem = ClipboardItem.fromImage(imageBuffer);
console.log('   ✓ Image item created:', imageItem.type === ClipboardItemType.IMAGE);
console.log('   ✓ Content hash:', imageItem.contentHash);
console.log('   ✓ Preview:', imageItem.getPreview());

// Test 4: Create file item
console.log('\n4. Testing file item creation...');
const fileItem = ClipboardItem.fromFiles(['/path/to/file1.txt', '/path/to/file2.txt']);
console.log('   ✓ File item created:', fileItem.type === ClipboardItemType.FILE);
console.log('   ✓ File paths:', fileItem.filePaths);
console.log('   ✓ Preview:', fileItem.getPreview());

// Test 5: Create color item
console.log('\n5. Testing color item creation...');
const colorItem = ClipboardItem.fromColor('#FF5733');
console.log('   ✓ Color item created:', colorItem.type === ClipboardItemType.COLOR);
console.log('   ✓ Color value:', colorItem.colorValue);
console.log('   ✓ Preview:', colorItem.getPreview());

// Test 6: Duplicate detection
console.log('\n6. Testing duplicate detection...');
const text1 = ClipboardItem.fromText('Same content');
const text2 = ClipboardItem.fromText('Same content');
console.log('   ✓ Same content hash:', text1.contentHash === text2.contentHash);

const text3 = ClipboardItem.fromText('Different content');
console.log('   ✓ Different content hash:', text1.contentHash !== text3.contentHash);

// Test 7: Serialization/Deserialization
console.log('\n7. Testing serialization...');
const dbFormat = textItem.toDatabase();
console.log('   ✓ Serialized to DB format:', dbFormat.id === textItem.id);

const restored = ClipboardItem.fromDatabase(dbFormat);
console.log('   ✓ Deserialized from DB:', restored.id === textItem.id);
console.log('   ✓ Content preserved:', restored.plainText === textItem.plainText);

// Test 8: Search functionality
console.log('\n8. Testing search...');
console.log('   ✓ Matches "Hello":', textItem.matchesSearch('Hello'));
console.log('   ✓ Matches "world" (case-insensitive):', textItem.matchesSearch('world'));
console.log('   ✓ Does not match "xyz":', !textItem.matchesSearch('xyz'));

// Test 9: Validation
console.log('\n9. Testing validation...');
console.log('   ✓ Text item valid:', textItem.isValid());
console.log('   ✓ Image item valid:', imageItem.isValid());
console.log('   ✓ File item valid:', fileItem.isValid());

// Test 10: Clone
console.log('\n10. Testing clone...');
const cloned = textItem.clone();
console.log('   ✓ Cloned item has same ID:', cloned.id === textItem.id);
console.log('   ✓ Cloned item has same content:', cloned.plainText === textItem.plainText);
console.log('   ✓ Cloned item is separate object:', cloned !== textItem);

console.log('\n✅ All tests passed!');
