import UIKit
import Capacitor
#if canImport(FoundationModels)
import FoundationModels
#endif

@objc(NavigatorLocalAIPlugin)
public final class NavigatorLocalAIPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NavigatorLocalAIPlugin"
    public let jsName = "NavigatorLocalAI"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "availability", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "respond", returnType: CAPPluginReturnPromise)
    ]

    @objc public func availability(_ call: CAPPluginCall) {
#if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            let model = SystemLanguageModel.default
            switch model.availability {
            case .available:
                call.resolve(["available": true])
            case .unavailable(.deviceNotEligible):
                call.resolve(["available": false, "reason": "device", "message": "Navigator local AI is not available on this device."])
            case .unavailable(.appleIntelligenceNotEnabled):
                call.resolve(["available": false, "reason": "disabled", "message": "Turn on Apple Intelligence to use Navigator local AI."])
            case .unavailable(.modelNotReady):
                call.resolve(["available": false, "reason": "not_ready", "message": "Navigator local AI is still getting ready on this iPhone."])
            case .unavailable:
                call.resolve(["available": false, "reason": "unavailable", "message": "Navigator local AI is not available right now."])
            }
            return
        }
#endif
        call.resolve(["available": false, "reason": "os", "message": "Navigator local AI requires iOS 26 or later."])
    }

    @objc public func respond(_ call: CAPPluginCall) {
        guard let instructions = call.getString("instructions"), !instructions.isEmpty,
              let prompt = call.getString("prompt"), !prompt.isEmpty else {
            call.reject("Navigator context is incomplete.")
            return
        }

#if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            let model = SystemLanguageModel.default
            guard model.isAvailable else {
                call.reject("Navigator local AI is not ready on this device.")
                return
            }

            Task { @MainActor in
                do {
                    let session = LanguageModelSession(instructions: instructions)
                    let response = try await session.respond(to: prompt)
                    let text = response.content.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !text.isEmpty else {
                        call.reject("Navigator did not produce a response.")
                        return
                    }
                    call.resolve(["text": text])
                } catch {
                    call.reject("Navigator local AI could not answer.", nil, error)
                }
            }
            return
        }
#endif
        call.reject("Navigator local AI requires iOS 26 or later.")
    }
}

final class NavigatorBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(NavigatorLocalAIPlugin())
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = NavigatorBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
