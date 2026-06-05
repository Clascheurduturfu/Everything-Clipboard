import SwiftUI

// MARK: - Design Tokens

private enum Theme {
    // Backgrounds
    static let background       = Color(hex: 0x101827)
    static let panelBg          = Color(hex: 0x182234)
    static let panelBorder      = Color(hex: 0x26354C)
    static let statusBg         = Color(hex: 0x102A3D)
    static let statusBorder     = Color(hex: 0x1C6F94)
    
    // Text
    static let textPrimary      = Color(hex: 0xE7EEF8)
    static let textSecondary    = Color(hex: 0x95A3B8)
    static let textLabel        = Color(hex: 0xB8C3D4)
    static let inputHint        = Color(hex: 0x66758A)
    
    // Accents
    static let accentBlue       = Color(hex: 0x4A90D9)
    static let accentTeal       = Color(hex: 0x00A6A6)
    
    // Status colors
    static let statusGreen      = Color(hex: 0x34D399)
    static let statusOrange     = Color(hex: 0xFBBF24)
    static let statusRed        = Color(hex: 0xF87171)
    
    static let cardCorner: CGFloat = 12
    static let cardPadding: CGFloat = 16
    static let pagePadding: CGFloat = 24
}

// MARK: - Hex Color Extension

private extension Color {
    init(hex: UInt, alpha: Double = 1.0) {
        self.init(
            .sRGB,
            red:   Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8)  & 0xFF) / 255.0,
            blue:  Double( hex        & 0xFF) / 255.0,
            opacity: alpha
        )
    }
}

// MARK: - Content View

struct ContentView: View {
    @EnvironmentObject var manager: ClipSyncManager
    
    // Local form state — synced to manager on save
    @State private var deviceName: String = ""
    @State private var serverURL: String = ""
    @State private var secretKey: String = ""
    @State private var isSaving = false
    @State private var showCopiedToast = false
    
    var body: some View {
        ZStack {
            // Full-screen background
            Theme.background
                .ignoresSafeArea()
            
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 20) {
                    headerSection
                    statusCard
                    connectionCard
                    clipboardActionsCard
                    footerDisclaimer
                }
                .padding(.horizontal, Theme.pagePadding)
                .padding(.top, 12)
                .padding(.bottom, 40)
            }
            
            // Copied-to-clipboard toast
            if showCopiedToast {
                VStack {
                    Spacer()
                    copiedToast
                        .padding(.bottom, 60)
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .zIndex(10)
            }
        }
        .animation(.easeInOut(duration: 0.35), value: manager.isConnected)
        .animation(.spring(response: 0.4, dampingFraction: 0.7), value: showCopiedToast)
        .onAppear {
            loadFormFromManager()
        }
    }
    
    // MARK: - Header
    
    private var headerSection: some View {
        VStack(spacing: 4) {
            HStack(spacing: 10) {
                // Subtle gradient icon
                Image(systemName: "arrow.triangle.2.circlepath")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Theme.accentBlue, Theme.accentTeal],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                
                Text("ClipSync")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Theme.textPrimary, Theme.accentBlue.opacity(0.8)],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
            }
            
            Text("Clipboard sync")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(Theme.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }
    
    // MARK: - Status Card
    
    private var statusCard: some View {
        HStack(spacing: 12) {
            // Animated pulse dot
            PulseDot(state: connectionState)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(statusTitle)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(Theme.textPrimary)
                
                Text(manager.statusText)
                    .font(.system(size: 13, weight: .regular))
                    .foregroundColor(Theme.textSecondary)
                    .lineLimit(2)
            }
            
            Spacer()
        }
        .padding(Theme.cardPadding)
        .background(
            RoundedRectangle(cornerRadius: Theme.cardCorner, style: .continuous)
                .fill(Theme.statusBg)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Theme.cardCorner, style: .continuous)
                .stroke(Theme.statusBorder, lineWidth: 1)
        )
    }
    
    private var statusTitle: String {
        switch connectionState {
        case .connected:  return "Connected"
        case .connecting: return "Connecting…"
        case .disconnected: return "Disconnected"
        }
    }
    
    private var connectionState: ConnectionState {
        if manager.isConnected { return .connected }
        if manager.isConnecting { return .connecting }
        return .disconnected
    }
    
    // MARK: - Connection Card
    
    private var connectionCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label {
                Text("Connection")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(Theme.textPrimary)
            } icon: {
                Image(systemName: "network")
                    .foregroundColor(Theme.accentBlue)
            }
            
            VStack(spacing: 14) {
                StyledField(
                    label: "Device Name",
                    placeholder: "e.g. My iPhone",
                    text: $deviceName,
                    icon: "iphone"
                )
                
                StyledField(
                    label: "Server URL",
                    placeholder: "ws://your-server:8000",
                    text: $serverURL,
                    icon: "link",
                    keyboardType: .URL,
                    autocapitalization: .never
                )
                
                StyledSecureField(
                    label: "Secret Key",
                    placeholder: "Your shared secret",
                    text: $secretKey,
                    icon: "key.fill"
                )
            }
            
            // Save & Connect Button
            Button {
                saveAndConnect()
            } label: {
                HStack(spacing: 8) {
                    if isSaving {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .scaleEffect(0.8)
                    } else {
                        Image(systemName: "bolt.fill")
                            .font(.system(size: 14, weight: .semibold))
                    }
                    Text("Save & Connect")
                        .font(.system(size: 16, weight: .semibold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(
                    LinearGradient(
                        colors: [Theme.accentBlue, Theme.accentBlue.opacity(0.8)],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            .buttonStyle(ScaleButtonStyle())
        }
        .padding(Theme.cardPadding)
        .background(
            RoundedRectangle(cornerRadius: Theme.cardCorner, style: .continuous)
                .fill(Theme.panelBg)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Theme.cardCorner, style: .continuous)
                .stroke(Theme.panelBorder, lineWidth: 1)
        )
    }
    
    // MARK: - Clipboard Actions Card
    
    private var clipboardActionsCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label {
                Text("Clipboard")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(Theme.textPrimary)
            } icon: {
                Image(systemName: "doc.on.clipboard")
                    .foregroundColor(Theme.accentTeal)
            }
            
            // Send Clipboard — hero button
            Button {
                sendClipboard()
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: "doc.on.clipboard.fill")
                        .font(.system(size: 18, weight: .medium))
                    Text("Send Clipboard")
                        .font(.system(size: 17, weight: .bold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(
                    LinearGradient(
                        colors: [Theme.accentTeal, Theme.accentTeal.opacity(0.75)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                .shadow(color: Theme.accentTeal.opacity(0.3), radius: 8, y: 4)
            }
            .buttonStyle(ScaleButtonStyle())
            
            // Last received
            if !manager.lastReceivedText.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Divider()
                        .background(Theme.panelBorder)
                    
                    Text("Last received from \(manager.lastReceivedDevice.isEmpty ? "unknown" : manager.lastReceivedDevice):")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(Theme.textLabel)
                    
                    Text(manager.lastReceivedText)
                        .font(.system(size: 14, weight: .regular, design: .monospaced))
                        .foregroundColor(Theme.textSecondary)
                        .lineLimit(3)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(10)
                        .background(
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .fill(Theme.background)
                        )
                    
                    Button {
                        copyToClipboard(manager.lastReceivedText)
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "doc.on.doc")
                                .font(.system(size: 13))
                            Text("Copy to Clipboard")
                                .font(.system(size: 14, weight: .semibold))
                        }
                        .foregroundColor(Theme.accentBlue)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .stroke(Theme.accentBlue, lineWidth: 1.5)
                        )
                    }
                    .buttonStyle(ScaleButtonStyle())
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
            
            Divider()
                .background(Theme.panelBorder)
            
            // Auto-copy toggle
            Toggle(isOn: $manager.autoCopyIncoming) {
                HStack(spacing: 8) {
                    Image(systemName: "arrow.down.doc.fill")
                        .foregroundColor(Theme.accentBlue)
                        .font(.system(size: 14))
                    Text("Auto-copy incoming clips")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(Theme.textPrimary)
                }
            }
            .tint(Theme.accentTeal)
        }
        .padding(Theme.cardPadding)
        .background(
            RoundedRectangle(cornerRadius: Theme.cardCorner, style: .continuous)
                .fill(Theme.panelBg)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Theme.cardCorner, style: .continuous)
                .stroke(Theme.panelBorder, lineWidth: 1)
        )
    }
    
    // MARK: - Footer
    
    private var footerDisclaimer: some View {
        HStack(spacing: 6) {
            Image(systemName: "info.circle")
                .font(.system(size: 12))
            Text("iOS cannot sync clipboard in the background.\nUse the Send button to share your clipboard.")
                .font(.system(size: 12, weight: .regular))
                .multilineTextAlignment(.center)
        }
        .foregroundColor(Theme.textSecondary.opacity(0.7))
        .frame(maxWidth: .infinity)
        .padding(.top, 4)
    }
    
    // MARK: - Copied Toast
    
    private var copiedToast: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(Theme.statusGreen)
            Text("Copied to clipboard")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Theme.textPrimary)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(
            Capsule()
                .fill(Theme.panelBg)
                .shadow(color: .black.opacity(0.4), radius: 12, y: 4)
        )
        .overlay(
            Capsule()
                .stroke(Theme.panelBorder, lineWidth: 1)
        )
    }
    
    // MARK: - Actions
    
    private func loadFormFromManager() {
        deviceName = manager.deviceName
        serverURL  = manager.serverURL
        secretKey  = manager.secretKey
    }
    
    private func saveAndConnect() {
        let impact = UIImpactFeedbackGenerator(style: .medium)
        impact.impactOccurred()
        
        isSaving = true
        
        manager.deviceName = deviceName
        manager.serverURL  = serverURL
        manager.secretKey  = secretKey
        manager.saveAndConnect()
        
        // Brief visual feedback
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            isSaving = false
        }
    }
    
    private func sendClipboard() {
        let impact = UIImpactFeedbackGenerator(style: .heavy)
        impact.impactOccurred()
        manager.sendClipboard()
    }
    
    private func copyToClipboard(_ text: String) {
        UIPasteboard.general.string = text
        
        let impact = UINotificationFeedbackGenerator()
        impact.notificationOccurred(.success)
        
        withAnimation {
            showCopiedToast = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            withAnimation {
                showCopiedToast = false
            }
        }
    }
}

// MARK: - Animated Pulse Dot

private enum ConnectionState {
    case connected, connecting, disconnected
    
    var color: Color {
        switch self {
        case .connected:    return Color(hex: 0x34D399)
        case .connecting:   return Color(hex: 0xFBBF24)
        case .disconnected: return Color(hex: 0xF87171)
        }
    }
}

private struct PulseDot: View {
    let state: ConnectionState
    @State private var isPulsing = false
    
    var body: some View {
        ZStack {
            // Outer pulse ring
            Circle()
                .fill(state.color.opacity(0.25))
                .frame(width: 24, height: 24)
                .scaleEffect(isPulsing ? 1.4 : 1.0)
                .opacity(isPulsing ? 0.0 : 0.6)
            
            // Inner dot
            Circle()
                .fill(state.color)
                .frame(width: 10, height: 10)
                .shadow(color: state.color.opacity(0.6), radius: 4)
        }
        .onAppear {
            withAnimation(
                .easeInOut(duration: state == .connecting ? 0.8 : 1.5)
                .repeatForever(autoreverses: false)
            ) {
                isPulsing = true
            }
        }
        .onChange(of: state) { _ in
            isPulsing = false
            withAnimation(
                .easeInOut(duration: state == .connecting ? 0.8 : 1.5)
                .repeatForever(autoreverses: false)
            ) {
                isPulsing = true
            }
        }
    }
}

// MARK: - Styled Text Field

private struct StyledField: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    var icon: String = ""
    var keyboardType: UIKeyboardType = .default
    var autocapitalization: TextInputAutocapitalization = .sentences
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(Theme.textLabel)
            
            HStack(spacing: 10) {
                if !icon.isEmpty {
                    Image(systemName: icon)
                        .foregroundColor(Theme.inputHint)
                        .font(.system(size: 14))
                        .frame(width: 18)
                }
                
                TextField("", text: $text, prompt: Text(placeholder).foregroundColor(Theme.inputHint))
                    .font(.system(size: 15))
                    .foregroundColor(Theme.textPrimary)
                    .keyboardType(keyboardType)
                    .textInputAutocapitalization(autocapitalization)
                    .autocorrectionDisabled()
                    .textFieldStyle(.plain)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(Theme.background)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(Theme.panelBorder, lineWidth: 1)
            )
        }
    }
}

// MARK: - Styled Secure Field

private struct StyledSecureField: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    var icon: String = ""
    @State private var isRevealed = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(Theme.textLabel)
            
            HStack(spacing: 10) {
                if !icon.isEmpty {
                    Image(systemName: icon)
                        .foregroundColor(Theme.inputHint)
                        .font(.system(size: 14))
                        .frame(width: 18)
                }
                
                Group {
                    if isRevealed {
                        TextField("", text: $text, prompt: Text(placeholder).foregroundColor(Theme.inputHint))
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                    } else {
                        SecureField("", text: $text, prompt: Text(placeholder).foregroundColor(Theme.inputHint))
                            .textInputAutocapitalization(.never)
                    }
                }
                .font(.system(size: 15))
                .foregroundColor(Theme.textPrimary)
                .textFieldStyle(.plain)
                
                Button {
                    isRevealed.toggle()
                } label: {
                    Image(systemName: isRevealed ? "eye.slash.fill" : "eye.fill")
                        .foregroundColor(Theme.inputHint)
                        .font(.system(size: 14))
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(Theme.background)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(Theme.panelBorder, lineWidth: 1)
            )
        }
    }
}

// MARK: - Scale Button Style

/// A press-down scale effect for a premium tactile feel.
private struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .opacity(configuration.isPressed ? 0.85 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

// MARK: - Preview

#Preview {
    ContentView()
        .environmentObject(ClipSyncManager())
}
