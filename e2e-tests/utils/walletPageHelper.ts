import { Page, BrowserContext, expect } from "@playwright/test"
import OnboardingHelper, { getOnboardingPage } from "./onboarding"

export default class WalletPageHelper {
  readonly url: string

  #onboardingHelper: OnboardingHelper

  get onboarding(): OnboardingHelper {
    return this.#onboardingHelper
  }

  constructor(
    public readonly popup: Page,
    public readonly context: BrowserContext,
    public readonly extensionId: string
  ) {
    this.url = `chrome-extension://${extensionId}/popup.html`
    this.#onboardingHelper = new OnboardingHelper(popup, context)
  }

  async setViewportSize(): Promise<void> {
    return this.popup.setViewportSize({ width: 384, height: 600 })
  }

  async goToStartPage(bringToFront = true): Promise<void> {
    if (bringToFront) {
      await this.popup.bringToFront()
    }
    await this.popup.goto(this.url)
  }

  async navigateTo(tab: string): Promise<void> {
    await this.popup
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: tab })
      .click()
  }

  /**
   * Onboard using walletPageHelper
   */
  async onboardWithSeedPhrase(recoveryPhrase: string): Promise<void> {
    const onboardingPage = await getOnboardingPage(this.context)
    await this.onboarding.addAccountFromSeed({
      phrase: recoveryPhrase,
      onboardingPage,
    })
    await this.setViewportSize()
    await this.goToStartPage()
  }

  async verifyTopWrap(network: RegExp, accountLabel: RegExp): Promise<void> {
    // TODO: maybe we could also verify graphical elements (network icon, profile picture, etc)?

    await expect(
      this.popup.getByTestId("top_menu_network_switcher").last()
    ).toHaveText(network)
    await this.popup
      .getByTestId("top_menu_network_switcher")
      .last()
      .click({ trial: true })

    await this.popup.locator(".connection_button").last().click({ trial: true })

    await expect(
      this.popup.getByTestId("top_menu_profile_button").last()
    ).toHaveText(accountLabel, { timeout: 240000 })
    await this.popup
      .getByTestId("top_menu_profile_button")
      .last()
      .click({ trial: true })
    // TODO: verify 'Copy address'
  }

  async verifyBottomWrap(): Promise<void> {
    await this.popup
      .getByLabel("Main")
      .getByText("Wallet", { exact: true })
      .click({ trial: true })
    await this.popup
      .getByLabel("Main")
      .getByText("NFTs", { exact: true })
      .click({ trial: true })
    await this.popup
      .getByLabel("Main")
      .getByText("Portfolio", { exact: true })
      .click({ trial: true })
    await this.popup
      .getByLabel("Main")
      .getByText("Settings", { exact: true })
      .click({ trial: true })
  }

  /**
   *  The function checks elements of the main page that should always be present.
   */
  async verifyCommonElements(
    network: RegExp,
    testnet: boolean,
    accountLabel: RegExp
  ): Promise<void> {
    await expect(this.popup.getByText("Total account balance")).toBeVisible({
      timeout: 240000,
    }) // we need longer timeout, because on fork it often takes long to load this section
    await expect(this.popup.getByTestId("wallet_balance")).toHaveText(
      /^\$(\d|,)+(\.\d{1,2})*$/
    )

    await this.verifyTopWrap(network, accountLabel)

    await this.popup
      .getByRole("button", { name: "Send", exact: true })
      .click({ trial: true })
    await this.popup
      .getByRole("button", { name: "Swap", exact: true })
      .click({ trial: true })
    await this.popup
      .getByRole("button", { name: "Receive", exact: true })
      .click({ trial: true })
    if (testnet === false) {
      await this.popup
        .getByTestId("panel_switcher")
        .getByText("NFTs", { exact: true })
        .click({ trial: true })
    }
    await this.popup
      .getByTestId("panel_switcher")
      .getByText("Assets", { exact: true })
      .click({ trial: true })
    await this.popup
      .getByTestId("panel_switcher")
      .getByText("Activity", { exact: true })
      .click({ trial: true })
    await this.verifyBottomWrap()
  }

  async verifyAnalyticsBanner(): Promise<void> {
    const analyticsBanner = this.popup.locator("div").filter({
      has: this.popup.getByRole("heading", {
        name: "Analytics are enabled",
        exact: true,
      }),
    })
    await expect(
      analyticsBanner.getByText(
        "They help us improve the wallet. You can disable anytime",
        { exact: true }
      )
    ).toBeVisible()
    await analyticsBanner
      .getByText("Change settings", { exact: true })
      .click({ trial: true })
  }

  async verifyDefaultWalletBanner(): Promise<void> {
    await expect(
      this.popup.getByText("Taho is not your default wallet")
    ).toBeVisible()
    await this.popup
      .locator(".default_toggle")
      .getByRole("button")
      .click({ trial: true })
  }

  async switchNetwork(network: RegExp): Promise<void> {
    await this.popup.getByTestId("top_menu_network_switcher").last().click()
    await this.popup.getByText(network).click()
    await expect(
      this.popup.getByTestId("top_menu_network_switcher").last()
    ).toHaveText(network)
  }

  /**
   * Hides the dApp Connection "use Taho as default" informational popup so
   * tests can proceed assuming dApp connection will be available without
   * additional interactions.
   */
  async hideDappConnectPopup(): Promise<void> {
    const dappPage = await this.context.newPage()
    await dappPage.goto("https://swap.cow.fi/")
    await dappPage
      .locator("#swap-button")
      .getByRole("button", { name: "Connect Wallet" })
      .click()

    const [popupPage] = await Promise.all([
      this.context.waitForEvent("page"),
      await dappPage.locator("text=Injected").click(), // Opens a new tab
    ])
    await popupPage.waitForLoadState()

    // Clear the one-time informational popup, if present.
    const connectingPopupTitle = popupPage.locator("h3", {
      hasText: "Connecting with Taho",
    })
    if ((await connectingPopupTitle.count()) > 0) {
      await expect(connectingPopupTitle).toBeVisible()
      const bgLocator = popupPage.locator(".bg")

      await bgLocator.click()
      await bgLocator.waitFor({ state: "detached", timeout: 1000 })
    }

    await popupPage.close()
    await dappPage.close()
  }
}
