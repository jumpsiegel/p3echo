import  {
    _parseVAAAlgorand,
    submitVAAHeader,
    TransactionSignerPair,
} from "@certusone/wormhole-sdk/lib/cjs/algorand/Algorand";

import {
    hexToUint8Array,
    textToUint8Array,
    uint8ArrayToHex,
} from "@certusone/wormhole-sdk/lib/cjs/utils";

import {
    redeemOnAlgorand,
    getIsTransferCompletedAlgorand,
    transferFromAlgorand,
    CHAIN_ID_ALGORAND,
    getSignedVAAWithRetry
} from "@certusone/wormhole-sdk";

import  {
    parseSequenceFromLogAlgorand
} from "@certusone/wormhole-sdk/lib/cjs/bridge";

import algosdk, {
    Account,
    Algodv2,
    Transaction,
    assignGroupID,
    makeApplicationCallTxnFromObject,
    makePaymentTxnWithSuggestedParamsFromObject,
    OnApplicationComplete,
    mnemonicToSecretKey,
    waitForConfirmation,
    bigIntToBytes,
    getApplicationAddress,
    decodeAddress
} from "algosdk";

import { NodeHttpTransport } from "@improbable-eng/grpc-web-node-http-transport";

import { BigNumber, ethers, utils } from "ethers";

async function signSendAndConfirmAlgorand(
    algodClient: Algodv2,
    txs: TransactionSignerPair[],
    wallet: Account
) {
    assignGroupID(txs.map((tx) => tx.tx));
    const signedTxns: Uint8Array[] = [];
    for (const tx of txs) {
        if (tx.signer) {
            signedTxns.push(await tx.signer.signTxn(tx.tx));
        } else {
            signedTxns.push(tx.tx.signTxn(wallet.sk));
        }
    }
    await algodClient.sendRawTransaction(signedTxns).do();
    const result = await waitForConfirmation(
        algodClient,
        txs[txs.length - 1].tx.txID(),
        1
    );
    return result;
}

class AlgoTests {
    constructor() {
    }

    async runTests() {
        const ALGO_TOKEN = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        const ALGOD_ADDRESS= "http://localhost";
        const ALGOD_PORT: number = 4001;

//        let t = "01000000021200ad60dde2f2c917c47ebda100af258d1cfc231b239926a7b8831482e4ae926b8b31961633fc4624ae113baaf89e4ac8e2f9941d6ed2a8fd21de228cb290db29ff0001ccea0e7f57e149014f84d99a3358128d9b7995e766b287085a594a0d727235c45d0b233acb72d0cdcc4d35027524687410d25ff23abaccbabdc0be68c7efdc7d000285839c7fb99e46c17c2c75871d37fd03d5adc11f8a020f2bfb5412b4758b527a06703e481693804d6ef1a4f04ad3cbd042c8fe407a9a69bb620f566d1715c33b0103ed25449ac9b5bc66ccb17ef55d4cec30dea5610209fa72c2b5f1387bb106fc861311012960ad9e8dc316284f63b7158c324e0540e2edd1a8e893c026692c606d010469ba8e562eced8c1c9b5b698b881137f081232a0eb69f0373472845b1e9242b148ad1e81aa250df2ede9e36f99c956d5edb3e46a531652be030b1222771470e8000550db5203ae3d989d5a8e39306f8a0d8e7656fe9d10443b638e5c716f5774d5ff718454cd3c6a08bad88a2fe294f465bbf96c2c3fedd156f46c8525059e0dca210106bb62558049e66dd94c46faa9be489d7b6cabb5390be1bcead64dbedbb27974ee4bd5a28fc31d287ad63218d6353f4f310172aacbda6d262453701d191612f30c0007520a6b27967eae610bfbec03d85ceb2c44d4ee734410e6bb849bce6456d364d33c780b759337bb2709000655135e1643e16cfabc5569705aa0d1cf17c0e0b71e0008c5e770b01f9b9049674f70bcae7bae72c0f8b63cc2789aed88237dbaf41346773988bdc829a57d41f2263d81961e1fd88b6acbaa429d79cb936a78a04fc9d01f0109c4b4c748d550a3359d59ae33ac65a46955eed0b8e89dac9a4c50dc7c752899a20e4875a3d1ba9eac3e97e2268889433646081494f9bf6de58a1aa3b715a33ebe010aa5d949e5f2faf60869fbd1dd385fcdc16018c5bfea3d580e94b5dd0cc40a89496a74ec52923ee4611f872530e7906d9ccbcf8cce575acd31c1cecc12edc6553b000ba9d5abedca7c9e97e40b29d770bae35e6d9230dbaa2d2ee01e5f40143b16d0ce268fdd719aabc0acba888f3a24bf301b046d1d87c6868cd5771ad0ebfabe93e5010db31ce91870d97d0a103043f6de25e65ef1274481c54d147990ef73ead35a6da018bdfff4bebda029f5626083ad7bdb3e21ca7300ad36ef875c63e839b9f09fa0010e3ced4ab09804f63d6941e9cd56502a670b2ead21f5807d52115211d8163daf2f10ce6515764314eb523a69c43b3790d638634bd8eb866920e598d22c4bc902de000fe7198448bb983672345440338e63d4f6dd899daa604369d4564c88f23b780af9278f7d5f46f22545ad231d7980396ffa4864f16f88682a417d4981c1e6780e1701108d21f716e3906ddd93ba486aec1518004f05aba7625eb86ce7b166caa36c76d57323ad6d8767810a0db2bd48263ab3fb01bbb5f9da041a29581ba6b6ef349d2300115755d7dc30cfe3f86e61312ba95c86b0e948784e0d4fdf1901799bbad0cb1331163d69d42b3e54e7633db88c71312535304b42283dab1a0772561a320a9edf4c0112dea706a6f980e120f050b1cf9db1613289ac74cf841ec7e8d8119a80083692a15f701f63fa8a56a3b9b8c4cfb84da8241746881f30b1c10eeea0715f65ca5a6601628848c90000000000016bb14509a612f01fbbc4cffeebd4bbfb492a86df717ebe92eb6df432a3f00a2500000000000257ca20503257480003000000010200050095c67940be40e0cc7ffaa1acb08ee3fab30955a197da1ec297ab133d4d43d86ee6ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace0000002d4e4dcd50000000000633a09ffffffff80000002d8cce75480000000006d0f2d601000000140000002000000000628848c900000000628848c800000000628848c70000002d510f85600000000006861d7b3515b3861e8fe93e5f540ba4077c216404782b86d5e78077b3cbfd27313ab3bce62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43000002a4ec7812a7000000008a91dfd9fffffff8000002a7585bb8800000000078c490c801000000160000002000000000628848c900000000628848c800000000628848c7000002a4f4d34cb50000000097abcfcb30fabb4e8ee48aec78799e8835c1b744d10d212c64f2671bed98d7b76a5306b0fa17ceaf30d19ba51112fdcc750cc83454776f47fb0112e4af07f15f4bb1ebc000000000028a1b120000000000005f32fffffff8000000000290a4da000000000000734a01000000090000000d00000000628848c900000000628848c700000000628848c500000000028a2e06000000000000622113e5dec32e8503a74b53c4df99407a88e82d3b012a3bcece38439236f55dada44456d442a152fd1f972b18459263ef467d3c29fb9d667e30c463b086691fbc790000000000002c78000000000000001ffffffff80000000000002de8000000000000004901000000050000000c00000000628848c900000000628848c800000000628848c20000000000002c74000000000000001a43b49df213dab041be392ab86e9eee7fd73cef911ee762a8a871703dc6a0844aef94acc2fb09eb976c6eb3000bab898cab891d5b800702cd1dc88e61d7c3c5e600000000005a0d01000000000000797bfffffff800000000005ce2d400000000000054f200000000020000000800000000628848c900000000628848c800000000628848b100000000005a0d01000000000000797b"
//        console.log(t)
//        let vaa = hexToUint8Array(t)
//        console.log(_parseVAAAlgorand(vaa))

        const client = new Algodv2(ALGO_TOKEN, ALGOD_ADDRESS, ALGOD_PORT);
        let sender = mnemonicToSecretKey("castle sing ice patrol mixture artist violin someone what access slow wrestle clap hero sausage oyster boost tone receive rapid bike announce pepper absent involve")

        const WORMHOLE_RPC_HOSTS = ["http://localhost:7071"];

        const CORE_ID = BigInt(4);
        const TOKEN_BRIDGE_ID = BigInt(6);

        const Fee: number = 0;
        var testapp: number = 46;
        var dest = utils.hexZeroPad(BigNumber.from(testapp).toHexString(), 32).substring(2);

        const transferTxs = await transferFromAlgorand(
            client,
            TOKEN_BRIDGE_ID,
            CORE_ID,
            sender.addr,
            BigInt(0),
            BigInt(100),
            dest,
            CHAIN_ID_ALGORAND,
            BigInt(Fee),
            hexToUint8Array("ff")
        );

        const transferResult = await signSendAndConfirmAlgorand(
            client,
            transferTxs,
            sender
        );
        const txSid = parseSequenceFromLogAlgorand(transferResult);


        const tbAddr: string = getApplicationAddress(TOKEN_BRIDGE_ID);
        const decTbAddr: Uint8Array = decodeAddress(tbAddr).publicKey;
        const aa: string = uint8ArrayToHex(decTbAddr);

        const signedVaa = await getSignedVAAWithRetry(
            WORMHOLE_RPC_HOSTS,
            CHAIN_ID_ALGORAND,
            aa,
            txSid,
            { transport: NodeHttpTransport() }
        );

        const txns = await redeemOnAlgorand(
            client,
            TOKEN_BRIDGE_ID,
            CORE_ID,
            signedVaa.vaaBytes,
            sender.addr
        );

        await signSendAndConfirmAlgorand(client, txns, sender);

        console.log(await getIsTransferCompletedAlgorand(
            client,
            TOKEN_BRIDGE_ID,
            signedVaa.vaaBytes
        ));
    }
}

let t = new AlgoTests()
t.runTests();
