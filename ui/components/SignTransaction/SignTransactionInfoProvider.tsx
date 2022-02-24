import { selectTransactionData } from "@tallyho/tally-background/redux-slices/transaction-construction"
import React, { ReactElement } from "react"
import { useBackgroundSelector } from "../../hooks"
import { SignTransactionInfo } from "./SignTransactionInfoBaseProvider"
import SignTransactionSignInfoProvider from "./SignTransactionSignInfoProvider"
import SignTransactionSpendAssetInfoProvider from "./SignTransactionSpendAssetInfoProvider"
import SignTransactionSwapAssetInfoProvider from "./SignTransactionSwapAssetInfoProvider"
import SignTransactionTransferInfoProvider from "./SignTransactionTransferInfoProvider"

/**
 * Creates transaction type-specific UI blocks and provides them to children.
 */
export default function SignTransactionInfoProvider({
  children,
}: {
  children: (info: SignTransactionInfo) => ReactElement
}): ReactElement {
  const transactionDetails = useBackgroundSelector(selectTransactionData)

  if (!transactionDetails) return <></>

  const annotation =
    "annotation" in transactionDetails
      ? transactionDetails.annotation
      : undefined

  switch (annotation?.type) {
    case "asset-swap":
      return (
        <SignTransactionSwapAssetInfoProvider
          inner={children}
          transactionDetails={transactionDetails}
          annotation={annotation}
        />
      )
    case "asset-approval":
      return (
        <SignTransactionSpendAssetInfoProvider
          inner={children}
          transactionDetails={transactionDetails}
          annotation={annotation}
        />
      )
    case "asset-transfer":
      return (
        <SignTransactionTransferInfoProvider
          inner={children}
          transactionDetails={transactionDetails}
          annotation={annotation}
        />
      )
    default:
      return (
        <SignTransactionSignInfoProvider
          inner={children}
          transactionDetails={transactionDetails}
          annotation={annotation}
        />
      )
  }
}
