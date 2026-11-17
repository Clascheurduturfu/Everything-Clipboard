package com.clipsync

import android.app.Activity
import android.util.Log
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams

/**
 * Google Play Billing for the one-time "ClipSync Lifetime" unlock. Every
 * purchase Play reports (new or restored) is verified and acknowledged by the
 * backend; the app never grants access from the client-side purchase alone.
 */
class PlayBilling(private val activity: Activity, private val listener: Listener) {

    interface Listener {
        fun onPrice(formattedPrice: String?)
        fun onPurchasePending()
        fun onPurchaseVerified(paid: Boolean, message: String?)
    }

    companion object {
        const val PRODUCT_ID = "clipsync_lifetime"
        private const val TAG = "ClipSyncBilling"
    }

    private var product: ProductDetails? = null

    private val client: BillingClient = BillingClient.newBuilder(activity)
        .setListener { result, purchases ->
            when (result.responseCode) {
                BillingClient.BillingResponseCode.OK -> purchases?.forEach { handle(it, userInitiated = true) }
                BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> restore(userInitiated = true)
                BillingClient.BillingResponseCode.USER_CANCELED -> Unit
                else -> listener.onPurchaseVerified(false, "Google Play: ${result.debugMessage.ifEmpty { "purchase failed" }}")
            }
        }
        .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
        .enableAutoServiceReconnection()
        .build()

    fun start() {
        client.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                    Log.w(TAG, "Billing unavailable: ${result.responseCode}")
                    activity.runOnUiThread { listener.onPrice(null) }
                    return
                }
                loadProduct()
                restore(userInitiated = false)
            }

            override fun onBillingServiceDisconnected() {}
        })
    }

    fun stop() = client.endConnection()

    private fun loadProduct() {
        val params = QueryProductDetailsParams.newBuilder().setProductList(listOf(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(PRODUCT_ID)
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
        )).build()
        client.queryProductDetailsAsync(params) { _, result ->
            product = result.productDetailsList.firstOrNull()
            val price = product?.oneTimePurchaseOfferDetails?.formattedPrice
            activity.runOnUiThread { listener.onPrice(price) }
        }
    }

    /** Re-sends owned purchases so reinstalls restore access and missed acknowledgements retry. */
    fun restore(userInitiated: Boolean) {
        val params = QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()
        client.queryPurchasesAsync(params) { result, purchases ->
            if (result.responseCode != BillingClient.BillingResponseCode.OK) return@queryPurchasesAsync
            purchases.filter { PRODUCT_ID in it.products }.forEach { handle(it, userInitiated) }
        }
    }

    /** Returns an error message when the purchase sheet cannot open. */
    fun launch(): String? {
        val details = product ?: return "ClipSync Lifetime is not available from Google Play right now."
        val accountRef = Account.accountRef(activity) ?: return "Sign in first."
        val productParams = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(details)
        details.oneTimePurchaseOfferDetails?.offerToken?.let { productParams.setOfferToken(it) }
        val flow = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(productParams.build()))
            .setObfuscatedAccountId(accountRef)
            .build()
        val result = client.launchBillingFlow(activity, flow)
        return if (result.responseCode == BillingClient.BillingResponseCode.OK) null
        else "Google Play: ${result.debugMessage.ifEmpty { "could not start the purchase" }}"
    }

    private fun handle(purchase: Purchase, userInitiated: Boolean) {
        when (purchase.purchaseState) {
            Purchase.PurchaseState.PENDING -> if (userInitiated) activity.runOnUiThread { listener.onPurchasePending() }
            Purchase.PurchaseState.PURCHASED -> {
                // Already acknowledged and already unlocked here: nothing to do.
                if (purchase.isAcknowledged && Account.isPaid(activity) && !userInitiated) return
                Account.verifyPurchase(activity, PRODUCT_ID, purchase.purchaseToken) { paid, status, error ->
                    val message = when {
                        paid -> null
                        status == "other_account" -> error
                        status == "pending" -> "Payment pending. ClipSync unlocks once Google confirms it."
                        status == "offline" || status == "error" ->
                            "Purchase received, but ClipSync could not confirm it yet. It will retry next time you open the app."
                        else -> error
                    }
                    if (paid || userInitiated || status == "other_account") listener.onPurchaseVerified(paid, message)
                }
            }
            else -> Unit
        }
    }
}
