#if canImport(UIKit)
import UIKit
import Foundation

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var didPresentScannerOnLaunch = false

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        // Keep existing storyboard or Capacitor setup; nothing to change here.
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        // Present the card scanner once on first activation
        guard !didPresentScannerOnLaunch else { return }
        didPresentScannerOnLaunch = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.presentScanner()
        }
    }

    private func presentScanner() {
#if canImport(UIKit)
        guard let root = window?.rootViewController else { return }
        #if canImport(AVFoundation)
        // Present scanner only if the scanner module is integrated; otherwise no-op
        if let ScannerType = NSClassFromString("CardScannerViewController") as? UIViewController.Type {
            let scanner = ScannerType.init()
            let scannerObject = scanner as NSObject
            scannerObject.setValue(self, forKey: "delegate")
            root.present(scanner, animated: true)
        }
        #endif
#endif
    }
}

#if canImport(UIKit)
#if canImport(AVFoundation)
@objc protocol _CardScannerShim: AnyObject {}

extension SceneDelegate /*: CardScannerViewControllerDelegate*/ {
    @objc func cardScanner(_ scanner: UIViewController, didCapture card: Any, croppedImage: UIImage) {
        // Dismiss scanner and optionally show a summary
        scanner.dismiss(animated: true) { [weak self] in
            guard let self = self, let root = self.window?.rootViewController else { return }
            let alert = UIAlertController(title: "Card Identified", message: "Card captured.", preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            root.present(alert, animated: true)
        }
    }

    @objc func cardScannerDidCancel(_ scanner: UIViewController) {
        scanner.dismiss(animated: true)
    }
}
#endif
#endif

#endif

