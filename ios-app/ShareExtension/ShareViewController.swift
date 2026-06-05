import UIKit
import Social
import UniformTypeIdentifiers

@MainActor
class ShareViewController: UIViewController {
    
    private var activityIndicator: UIActivityIndicatorView!
    private var statusLabel: UILabel!
    
    // Using a separate instance of WebSocketClient instead of ClipSyncManager
    // to keep it lightweight.
    private var wsClient: WebSocketClient?
    private var textToSend: String?
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        extractText()
    }
    
    private func setupUI() {
        view.backgroundColor = UIColor(white: 0.1, alpha: 0.9)
        view.layer.cornerRadius = 12
        
        let container = UIView()
        container.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(container)
        
        activityIndicator = UIActivityIndicatorView(style: .large)
        activityIndicator.color = .white
        activityIndicator.startAnimating()
        activityIndicator.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(activityIndicator)
        
        statusLabel = UILabel()
        statusLabel.text = "Sending to ClipSync..."
        statusLabel.textColor = .white
        statusLabel.font = .systemFont(ofSize: 16, weight: .medium)
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(statusLabel)
        
        NSLayoutConstraint.activate([
            container.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            container.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            
            activityIndicator.topAnchor.constraint(equalTo: container.topAnchor),
            activityIndicator.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            
            statusLabel.topAnchor.constraint(equalTo: activityIndicator.bottomAnchor, constant: 16),
            statusLabel.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            statusLabel.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            statusLabel.bottomAnchor.constraint(equalTo: container.bottomAnchor)
        ])
    }
    
    private func extractText() {
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
              let attachments = item.attachments else {
            complete(error: true)
            return
        }
        
        // Try to load plain text or URL
        var found = false
        for attachment in attachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] item, _ in
                    if let text = item as? String {
                        self?.prepareToSend(text)
                    }
                }
                found = true
                break
            } else if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] item, _ in
                    if let url = item as? URL {
                        self?.prepareToSend(url.absoluteString)
                    }
                }
                found = true
                break
            }
        }
        
        if !found {
            complete(error: true)
        }
    }
    
    private func prepareToSend(_ text: String) {
        Task { @MainActor in
            self.textToSend = text
            self.connectAndSend()
        }
    }
    
    private func connectAndSend() {
        let defaults = UserDefaults(suiteName: "group.com.clipsync.ios") ?? .standard
        let serverUrl = defaults.string(forKey: "clipsync_server_url") ?? ""
        let secretKey = defaults.string(forKey: "clipsync_secret_key") ?? ""
        let deviceName = defaults.string(forKey: "clipsync_device_name") ?? "iOS Extension"
        
        guard !serverUrl.isEmpty, !secretKey.isEmpty, let text = textToSend else {
            statusLabel.text = "Please configure ClipSync app first."
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                self.complete(error: true)
            }
            return
        }
        
        Task.detached(priority: .userInitiated) {
            let key = CryptoUtils.deriveKey(secret: secretKey)
            let roomId = CryptoUtils.getRoomId(secret: secretKey)
            
            guard let payload = CryptoUtils.encryptPayload(deviceName: deviceName, content: text, key: key) else {
                await MainActor.run { self.complete(error: true) }
                return
            }
            
            await MainActor.run {
                self.wsClient = WebSocketClient(
                    url: serverUrl,
                    roomId: roomId,
                    onMessage: { _ in }, // don't care about incoming messages
                    onConnected: {
                        self.wsClient?.send(payload)
                        self.statusLabel.text = "Sent!"
                        self.activityIndicator.stopAnimating()
                        
                        // Give it a moment to actually send over the wire
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                            self.wsClient?.disconnect()
                            self.complete(error: false)
                        }
                    },
                    onDisconnected: { _ in
                        self.complete(error: true)
                    }
                )
                self.wsClient?.connect()
                
                // Timeout
                DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
                    self.complete(error: true)
                }
            }
        }
    }
    
    private func complete(error: Bool) {
        if error && statusLabel.text == "Sending to ClipSync..." {
            statusLabel.text = "Failed."
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + (error ? 1.0 : 0.0)) {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
