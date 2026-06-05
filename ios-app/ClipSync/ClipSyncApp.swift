import SwiftUI

@main
struct ClipSyncApp: App {
    @StateObject private var manager = ClipSyncManager()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(manager)
        }
    }
}
