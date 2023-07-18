import {
  EIP1193_ERROR_CODES,
  PermissionRequest,
} from "@tallyho/provider-bridge-shared"
import sinon from "sinon"
import browser from "webextension-polyfill"
// FIXME Pull the appropriate dependency to this package.json so we're not
// FIXME relying on weird cross-package dependencies.
// eslint-disable-next-line import/no-extraneous-dependencies
import { waitFor } from "@testing-library/dom"
import * as popupUtils from "../show-popup"
import * as featureFlags from "../../../features"
import { createProviderBridgeService } from "../../../tests/factories"
import { AddEthereumChainParameter } from "../../internal-ethereum-provider"
import ProviderBridgeService from "../index"
import { validateAddEthereumChainParameter } from "../utils"
import { ETHEREUM } from "../../../constants"

const WINDOW = {
  focused: true,
  incognito: false,
  alwaysOnTop: true,
}

const CHAIN_ID = "1"
const ADDRESS = "0x0000000000000000000000000000000000000000"

const BASE_DATA = {
  enablingPermission: {
    key: `https://app.test_${"0x0000000000000000000000000000000000000000"}_${CHAIN_ID}`,
    origin: "https://app.test",
    faviconUrl: "https://app.test/favicon.png",
    title: "Test",
    state: "allow",
    accountAddress: ADDRESS,
    chainID: CHAIN_ID,
  } as PermissionRequest,
  origin: "https://app.test",
}

const PARAMS = {
  eth_accounts: ["Test", "https://app.test/favicon.png"],
  eth_sendTransaction: [
    {
      from: ADDRESS,
      data: Date.now().toString(),
      gasPrice: "0xf4240",
      to: "0x1111111111111111111111111111111111111111",
    },
  ],
}
describe("ProviderBridgeService", () => {
  let providerBridgeService: ProviderBridgeService
  const sandbox = sinon.createSandbox()

  beforeEach(async () => {
    browser.windows.getCurrent = jest.fn(() => Promise.resolve(WINDOW))
    browser.windows.create = jest.fn(() => Promise.resolve(WINDOW))
    providerBridgeService = await createProviderBridgeService()
    await providerBridgeService.startService()
    sandbox.restore()
  })

  afterEach(async () => {
    await providerBridgeService.stopService()
    jest.clearAllMocks()
  })

  describe("routeContentScriptRPCRequest", () => {
    it("eth_accounts should return the account address owned by the client", async () => {
      const { enablingPermission, origin } = BASE_DATA
      const method = "eth_accounts"
      const params = PARAMS[method]

      const response = await providerBridgeService.routeContentScriptRPCRequest(
        enablingPermission,
        method,
        params,
        origin
      )
      expect(response).toEqual([enablingPermission.accountAddress])
    })

    it("eth_sendTransaction should call routeSafeRequest when a user has permission to sign", async () => {
      const { enablingPermission, origin } = BASE_DATA
      const method = "eth_sendTransaction"
      const params = PARAMS[method]
      const stub = sandbox.stub(providerBridgeService, "routeSafeRequest")

      await providerBridgeService.routeContentScriptRPCRequest(
        enablingPermission,
        method,
        params,
        origin
      )

      expect(stub.called).toBe(true)
    })

    it("eth_sendTransaction should not call routeSafeRequest when a user has not permission to sign", async () => {
      const { enablingPermission, origin } = BASE_DATA
      const method = "eth_sendTransaction"
      const params = PARAMS[method]
      const stub = sandbox.stub(providerBridgeService, "routeSafeRequest")

      const response = await providerBridgeService.routeContentScriptRPCRequest(
        { ...enablingPermission, state: "deny" },
        method,
        params,
        origin
      )

      expect(stub.called).toBe(false)
      expect(response).toBe(EIP1193_ERROR_CODES.unauthorized)
    })

    it("should wait for user confirmation before calling wallet_AddEtherumChain", async () => {
      const params = [
        {
          chainId: "0xfa",
          chainName: "Fantom Opera",
          nativeCurrency: { name: "Fantom", symbol: "FTM", decimals: 18 },
          rpcUrls: [
            "https://fantom-mainnet.gateway.pokt.network/v1/lb/62759259ea1b320039c9e7ac",
            "https://rpc.ftm.tools",
            "https://rpc.ankr.com/fantom",
            "https://rpc.fantom.network",
          ],
          blockExplorerUrls: ["https://ftmscan.com"],
        },
        "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        "some site",
        "favicon.png",
      ]

      const { enablingPermission } = BASE_DATA

      jest.spyOn(featureFlags, "isEnabled").mockImplementation(() => true)
      const showPopupSpy = jest.spyOn(popupUtils, "default")

      const request = providerBridgeService.routeContentScriptRPCRequest(
        {
          ...enablingPermission,
        },
        "wallet_addEthereumChain",
        params,
        enablingPermission.origin
      )

      // @ts-expect-error private access to reference the service
      const IEP = providerBridgeService.internalEthereumProviderService
      const spy = jest.spyOn(IEP, "routeSafeRPCRequest")

      // wait until popup is set up
      await waitFor(() => expect(showPopupSpy).toHaveBeenCalled())

      const validatedPayload = validateAddEthereumChainParameter(
        params[0] as AddEthereumChainParameter
      )

      await waitFor(() =>
        expect(providerBridgeService.getNewCustomRPCDetails("0")).toEqual({
          ...validatedPayload,
          favicon: "favicon.png",
          siteTitle: "some site",
        })
      )

      expect(spy).not.toHaveBeenCalled()
      providerBridgeService.handleAddNetworkRequest("0", true)

      await waitFor(() =>
        expect(spy).toHaveBeenCalledWith(
          "wallet_addEthereumChain",
          [validatedPayload, "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"],
          BASE_DATA.origin
        )
      )

      await expect(request).resolves.toEqual(null) // resolves without errors
    })

    it("should skip user confirmation if the network already exists", async () => {
      const params = [
        {
          chainId: "1",
          chainName: "Ethereum Mainnet",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          iconUrl: undefined,
          rpcUrls: ["booyan"],
          blockExplorerUrls: ["https://etherscan.io"],
        },
        "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        "some site",
        "favicon.png",
      ]

      const { enablingPermission } = BASE_DATA

      jest.spyOn(featureFlags, "isEnabled").mockImplementation(() => true)
      const showPopupSpy = jest.spyOn(popupUtils, "default")

      const internalEthereumProvider =
        // @ts-expect-error private access to reference the service
        providerBridgeService.internalEthereumProviderService
      jest
        .spyOn(internalEthereumProvider, "getTrackedNetworkByChainId")
        .mockImplementation(() => Promise.resolve(ETHEREUM))
      const internalEthereumProviderSpy = jest.spyOn(
        internalEthereumProvider,
        "routeSafeRPCRequest"
      )

      const request = providerBridgeService.routeContentScriptRPCRequest(
        {
          ...enablingPermission,
        },
        "wallet_addEthereumChain",
        params,
        enablingPermission.origin
      )

      await waitFor(() =>
        expect(internalEthereumProviderSpy).toHaveBeenCalledWith(
          "wallet_addEthereumChain",
          params,
          BASE_DATA.origin
        )
      )

      // expect no popup
      expect(showPopupSpy).not.toHaveBeenCalled()
      await expect(request).resolves.toEqual(null) // resolves without errors
    })
  })
})
