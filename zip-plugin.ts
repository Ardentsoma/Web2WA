import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

const pluginPhpContent = fs.readFileSync(path.join(process.cwd(), 'public/web2wa-plugin.php'), 'utf8');

const readmeContent = `=== Web2WA - WhatsApp Order & Logistics Bridge ===
Contributors: aistudio
Tags: woocommerce, whatsapp, logistics, checkout, orders
Requires at least: 5.4
Tested up to: 6.5
Stable tag: 2.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Connects WooCommerce orders with WhatsApp for customer communication and delivery logistics.

== Description ==
Web2WA bridges WooCommerce checkout with WhatsApp. Customers pay via standard payment gateways (Stripe, PayPal, Cash on Delivery, etc.) and are provided a direct WhatsApp button on the Thank You page pre-populated with their order details to arrange logistics and delivery.

== Installation ==
1. Go to Plugins > Add New > Upload Plugin.
2. Select web2wa-plugin.zip and click Install Now.
3. Activate the plugin.
4. Navigate to Settings > WhatsApp Logistics in WordPress admin to set your WhatsApp phone number.
`;

const zip = new AdmZip();
zip.addFile('web2wa-plugin/web2wa-plugin.php', Buffer.from(pluginPhpContent, 'utf8'));
zip.addFile('web2wa-plugin/readme.txt', Buffer.from(readmeContent, 'utf8'));

const outputPath = path.join(process.cwd(), 'public/web2wa-plugin.zip');
zip.writeZip(outputPath);

console.log(`Plugin zipped successfully to ${outputPath}`);
