<?php
/**
 * Plugin Name: Web2WA - WhatsApp Order & Logistics Bridge
 * Plugin URI: https://wordpress.org/plugins/web2wa
 * Description: Connects WooCommerce orders with WhatsApp for direct customer communication and delivery logistics coordination. Includes customizable message templates.
 * Version: 2.2.0
 * Author: Nmesoma N. Sunday
 * Text Domain: web2wa
 * Requires at least: 5.4
 * Requires PHP: 7.2
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

/**
 * Initialize Plugin Hooks
 */
add_action( 'plugins_loaded', 'web2wa_init_plugin' );

function web2wa_init_plugin() {
    // Check if WooCommerce is active
    if ( ! class_exists( 'WooCommerce' ) && ! function_exists( 'WC' ) ) {
        add_action( 'admin_notices', 'web2wa_missing_wc_notice' );
        return;
    }

    // Register Admin Settings
    add_action( 'admin_menu', 'web2wa_add_admin_menu' );
    add_action( 'admin_init', 'web2wa_settings_init' );

    // Checkout Notice
    add_action( 'woocommerce_review_order_before_submit', 'web2wa_checkout_notice' );

    // Post-payment WhatsApp redirect button on Thank You page
    add_action( 'woocommerce_thankyou', 'web2wa_post_payment_redirect', 10, 1 );
}

/**
 * Admin notice if WooCommerce is missing
 */
function web2wa_missing_wc_notice() {
    echo '<div class="notice notice-error"><p>';
    echo esc_html__( 'Web2WA plugin requires WooCommerce to be installed and active.', 'web2wa' );
    echo '</p></div>';
}

/**
 * Admin Menu Setup
 */
function web2wa_add_admin_menu() {
    // Add under WooCommerce menu in WP Admin
    add_submenu_page(
        'woocommerce',
        __( 'WhatsApp Logistics', 'web2wa' ),
        __( 'WhatsApp Logistics', 'web2wa' ),
        'manage_options',
        'web2wa',
        'web2wa_options_page'
    );

    // Also add under Settings menu as fallback
    add_options_page( 
        __( 'WhatsApp Logistics', 'web2wa' ), 
        __( 'WhatsApp Logistics', 'web2wa' ), 
        'manage_options', 
        'web2wa', 
        'web2wa_options_page' 
    );
}

/**
 * Built-in Message Templates
 */
function web2wa_get_template_presets() {
    return array(
        'delivery' => array(
            'title'   => __( '🚚 Delivery Confirmation (Default)', 'web2wa' ),
            'content' => "🚚 Delivery Confirmation\n\n" .
                         "Order: #{order_number}\n" .
                         "Payment: Confirmed ✅\n\n" .
                         "Customer: {customer_name}\n" .
                         "Phone: {customer_phone}\n\n" .
                         "Items:\n{items}\n\n" .
                         "Delivery Location:\n{address}\n\n" .
                         "Hello, I have completed payment. Kindly confirm my payment and help me arrange delivery."
        ),
        'compact' => array(
            'title'   => __( '⚡ Compact Order Summary', 'web2wa' ),
            'content' => "📦 Order #{order_number} Paid ({total_paid})\n" .
                         "Name: {customer_name} ({customer_phone})\n" .
                         "Items: {items}\n" .
                         "Address: {address}\n\n" .
                         "Hi, please dispatch my order."
        ),
        'detailed' => array(
            'title'   => __( '📋 Detailed Logistics Receipt', 'web2wa' ),
            'content' => "===========================\n" .
                         " 🚚 LOGISTICS DISPATCH REQUEST\n" .
                         "===========================\n" .
                         "Order ID: #{order_number}\n" .
                         "Status: Paid ({payment_status})\n" .
                         "Total Paid: {total_paid}\n\n" .
                         "CUSTOMER DETAILS:\n" .
                         "• Name: {customer_name}\n" .
                         "• Phone: {customer_phone}\n" .
                         "• Address: {address}\n\n" .
                         "PURCHASED ITEMS:\n" .
                         "{items}\n\n" .
                         "Kindly process for shipping and reply with tracking details."
        )
    );
}

function web2wa_get_default_template() {
    $presets = web2wa_get_template_presets();
    return $presets['delivery']['content'];
}

/**
 * Settings API Registration
 */
function web2wa_settings_init() {
    register_setting( 'web2wa_pluginPage', 'web2wa_settings' );

    add_settings_section( 
        'web2wa_pluginPage_section', 
        __( 'WhatsApp Logistics & Message Template Settings', 'web2wa' ), 
        'web2wa_settings_section_callback', 
        'web2wa_pluginPage' 
    );

    add_settings_field( 
        'phone', 
        __( 'WhatsApp Receiver Phone Number', 'web2wa' ), 
        'web2wa_phone_render', 
        'web2wa_pluginPage', 
        'web2wa_pluginPage_section' 
    );

    add_settings_field( 
        'message_template', 
        __( 'Message Structure / Format', 'web2wa' ), 
        'web2wa_template_render', 
        'web2wa_pluginPage', 
        'web2wa_pluginPage_section' 
    );
    
    add_settings_field( 
        'checkout_notice', 
        __( 'Checkout Page Notice', 'web2wa' ), 
        'web2wa_notice_render', 
        'web2wa_pluginPage', 
        'web2wa_pluginPage_section' 
    );
}

function web2wa_phone_render() {
    $options = get_option( 'web2wa_settings' );
    $phone = isset( $options['phone'] ) ? $options['phone'] : '';
    ?>
    <input type='text' name='web2wa_settings[phone]' value='<?php echo esc_attr( $phone ); ?>' class="regular-text" placeholder="e.g. 2348030000000">
    <p class="description"><?php echo esc_html__( 'Enter your WhatsApp number with country code, without "+" or spaces (e.g. 2348030000000 or 15551234567).', 'web2wa' ); ?></p>
    <?php
}

function web2wa_template_render() {
    $options = get_option( 'web2wa_settings' );
    $template = ! empty( $options['message_template'] ) ? $options['message_template'] : web2wa_get_default_template();
    $presets = web2wa_get_template_presets();
    ?>
    <div style="margin-bottom: 12px;">
        <label><strong><?php echo esc_html__( 'Load Template Preset:', 'web2wa' ); ?></strong> </label>
        <select id="web2wa-preset-select" onchange="web2waLoadPreset(this.value)">
            <option value=""><?php echo esc_html__( '-- Select Preset --', 'web2wa' ); ?></option>
            <?php foreach ( $presets as $key => $preset ) : ?>
                <option value="<?php echo esc_attr( $key ); ?>"><?php echo esc_html( $preset['title'] ); ?></option>
            <?php endforeach; ?>
        </select>
    </div>

    <textarea id="web2wa-template-input" name='web2wa_settings[message_template]' rows='12' cols='70' class="large-text code"><?php echo esc_textarea( $template ); ?></textarea>
    
    <script type="text/javascript">
        var web2waPresets = <?php echo wp_json_encode( array_map( function( $p ) { return $p['content']; }, $presets ) ); ?>;
        function web2waLoadPreset(key) {
            if (key && web2waPresets[key]) {
                document.getElementById('web2wa-template-input').value = web2waPresets[key];
            }
        }
    </script>

    <p class="description" style="margin-top: 10px;">
        <strong><?php echo esc_html__( 'Available Dynamic Tags:', 'web2wa' ); ?></strong><br>
        <code>{order_number}</code> - WooCommerce Order ID<br>
        <code>{customer_name}</code> - Billing First & Last Name<br>
        <code>{customer_phone}</code> - Customer Phone Number<br>
        <code>{items}</code> - List of items purchased<br>
        <code>{address}</code> - Shipping / Billing Address<br>
        <code>{total_paid}</code> - Total Order Amount Paid<br>
        <code>{payment_status}</code> - Confirmed ✅
    </p>
    <?php
}

function web2wa_notice_render() {
    $options = get_option( 'web2wa_settings' );
    $notice = isset( $options['checkout_notice'] ) ? $options['checkout_notice'] : 'Note: After successful payment, you will be redirected to WhatsApp to finalize delivery logistics.';
    ?>
    <textarea name='web2wa_settings[checkout_notice]' rows='3' cols='70' class="large-text"><?php echo esc_textarea( $notice ); ?></textarea>
    <p class="description"><?php echo esc_html__( 'Instructional message shown to buyers on the WooCommerce checkout page.', 'web2wa' ); ?></p>
    <?php
}

function web2wa_settings_section_callback() {
    echo esc_html__( 'Configure your WhatsApp phone number and customize the message format sent by customers after checkout.', 'web2wa' );
}

function web2wa_options_page() {
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }
    ?>
    <div class="wrap">
        <h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
        <form action='options.php' method='post'>
            <?php
            settings_fields( 'web2wa_pluginPage' );
            do_settings_sections( 'web2wa_pluginPage' );
            submit_button( __( 'Save WhatsApp Settings', 'web2wa' ) );
            ?>
        </form>
    </div>
    <?php
}

/**
 * Display Notice on Checkout Page
 */
function web2wa_checkout_notice() {
    $options = get_option( 'web2wa_settings' );
    $notice = isset( $options['checkout_notice'] ) ? $options['checkout_notice'] : 'Note: After payment, you will be redirected to WhatsApp for logistics.';
    echo '<div class="web2wa-checkout-info" style="margin-bottom: 20px; padding: 15px; background: #e7f9ed; border-left: 4px solid #25D366; font-size: 0.95em; border-radius: 4px;">';
    echo '<strong>' . esc_html__( 'WhatsApp Logistics:', 'web2wa' ) . '</strong> ' . esc_html( $notice );
    echo '</div>';
}

/**
 * Thank You Page WhatsApp Redirect / Button
 */
function web2wa_post_payment_redirect( $order_id ) {
    if ( ! $order_id ) return;
    
    $order = wc_get_order( $order_id );
    if ( ! $order ) return;

    $options = get_option( 'web2wa_settings' );
    $phone = isset( $options['phone'] ) ? $options['phone'] : '';

    if ( empty( $phone ) ) return;

    $message = web2wa_generate_whatsapp_message( $order );
    $wa_url = "https://wa.me/" . preg_replace( '/[^0-9]/', '', $phone ) . "?text=" . rawurlencode( $message );

    echo '<div class="web2wa-success-box" style="margin: 25px 0; padding: 25px; border: 2px dashed #25D366; border-radius: 12px; text-align: center; background: #ffffff;">';
    echo '<h3 style="color: #25D366; margin-top: 0; font-size: 1.4em;">✅ ' . esc_html__( 'Payment Received!', 'web2wa' ) . '</h3>';
    echo '<p style="font-size: 1.05em; color: #555;">' . esc_html__( 'Click below to send your receipt and coordinate delivery logistics via WhatsApp.', 'web2wa' ) . '</p>';
    echo '<a href="' . esc_attr( $wa_url ) . '" target="_blank" rel="noopener noreferrer" style="background-color: #25D366; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block; font-size: 1.1em; box-shadow: 0 4px 15px rgba(37,211,102,0.3); transition: all 0.2s ease;">' . esc_html__( 'Chat with Logistics Details', 'web2wa' ) . '</a>';
    echo '</div>';
}

/**
 * Format Order Details for WhatsApp Message
 */
function web2wa_generate_whatsapp_message( $order ) {
    $options = get_option( 'web2wa_settings' );
    $template = ! empty( $options['message_template'] ) ? $options['message_template'] : web2wa_get_default_template();

    // Format items
    $items_arr = array();
    foreach ( $order->get_items() as $item ) {
        $items_arr[] = "• " . $item->get_name() . " ×" . $item->get_quantity();
    }
    $items_str = implode( "\n", $items_arr );

    // Format address
    $address_parts = array_filter( array(
        $order->get_billing_address_1(),
        $order->get_billing_address_2(),
        $order->get_billing_city(),
        $order->get_billing_state()
    ) );
    $address_str = ! empty( $address_parts ) ? implode( ", ", $address_parts ) : __( 'Not specified', 'web2wa' );

    $customer_name = trim( $order->get_billing_first_name() . ' ' . $order->get_billing_last_name() );
    if ( empty( $customer_name ) ) {
        $customer_name = __( 'Valued Customer', 'web2wa' );
    }

    $customer_phone = $order->get_billing_phone();
    if ( empty( $customer_phone ) ) {
        $customer_phone = __( 'N/A', 'web2wa' );
    }

    $total_paid = strip_tags( html_entity_decode( wc_price( $order->get_total(), array( 'currency' => $order->get_currency() ) ) ) );

    $replacements = array(
        '{order_number}'   => $order->get_order_number(),
        '{customer_name}'  => $customer_name,
        '{customer_phone}' => $customer_phone,
        '{items}'          => $items_str,
        '{address}'        => $address_str,
        '{total_paid}'     => $total_paid,
        '{payment_status}' => 'Confirmed ✅',
    );

    return str_replace( array_keys( $replacements ), array_values( $replacements ), $template );
}
