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
        guard let root = window?.rootViewController else { return }
        let scanner = CardScannerViewController()
        scanner.delegate = self
        root.present(scanner, animated: true)
    }
}
// MARK: - CardScannerViewControllerDelegate

extension SceneDelegate: CardScannerViewControllerDelegate {
    func cardScanner(_ scanner: CardScannerViewController, didCapture card: TCGCard, croppedImage: UIImage) {
        // Dismiss scanner and optionally show a summary
        scanner.dismiss(animated: true) {
            guard let root = self.window?.rootViewController else { return }
            let message = [
                "Name: \(card.name)",
                card.rarity.flatMap { "Rarity: \($0)" },
                (card.setName ?? card.setCode).flatMap { "Set: \($0)" },
                card.number.flatMap { "Number: \($0)" }
            ].compactMap { $0 }.joined(separator: "\n")
            let alert = UIAlertController(title: "Card Identified", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            root.present(alert, animated: true)
        }
    }

    func cardScannerDidCancel(_ scanner: CardScannerViewController) {
        scanner.dismiss(animated: true)
    }
}

