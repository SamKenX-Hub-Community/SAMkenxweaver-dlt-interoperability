/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import * as path from 'path'
import {
    commandHelp,
    pledgeAsset,
    getNetworkConfig,
    getLocalAssetPledgeDetails,
    getChaincodeConfig,
    handlePromise
} from '../../../helpers/helpers'
import {
    fabricHelper,
    getKeyAndCertForRemoteRequestbyUserName
} from '../../../helpers/fabric-functions'
import { InteroperableHelper } from '@hyperledger-labs/weaver-fabric-interop-sdk'

import logger from '../../../helpers/logger'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const delay = ms => new Promise(res => setTimeout(res, ms))

const command: GluegunCommand = {
  name: 'reclaim',
  description:
    'Reclaims pledged asset in source network',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        'fabric-cli asset transfer reclaim --source-network=network1 --user=alice --type=bond --pledge-id="pledgeid" --param=bond01:a03\r\nfabric-cli asset transfer reclaim --source-network=network1 --user=alice --type=token --param=token1:50',
        'fabric-cli asset transfer reclaim --source-network=<source-network-name> --user=<user-id> --type=<bond|token> --pledge-id=<pledge-id> --param=<asset-type>:<asset-id|num-units>',
        [
          {
            name: '--debug',
            description:
              'Shows debug logs when running. Disabled by default. To enable --debug=true'
          },
          {
            name: '--source-network',
            description:
              'Network where the asset is currently present. <network1|network2>'
          },
          {
            name: '--user',
            description:
              'User (wallet) ID of the reclaimer'
          },
          {
            name: '--type',
            description:
              'Type of network <bond|token>'
          },
          {
            name: '--pledge-id',
            description:
              'Pledge Id associated with asset transfer.'
          },
          {
            name: '--param',
            description:
              'Colon separated Asset Type and Asset ID or Asset Type and Num of Units.'
          },
          {
            name: '--relay-tls',
            description: 'Flag indicating whether or not the relay is TLS-enabled.'
          },
          {
            name: '--relay-tls-ca-files',
            description: 'Colon-separated list of root CA certificate paths used to connect to the relay over TLS.'
          }
        ],
        command,
        ['asset', 'transfer', 'reclaim']
      )
      return
    }

    if (options.debug === 'true') {
      logger.level = 'debug'
      logger.debug('Debugging is enabled')
    }
    if (!options['source-network'])
    {
      print.error('--source-network needs to be specified')
      return
    }
    if (!options['user'])
    {
      print.error('--user needs to be specified')
      return
    }
    if (!options['type'])
    {
      print.error('--type of network needs to be specified')
      return
    }
    if (!options['param'])
    {
      print.error('--param needs to be specified')
      return
    }
    
    const params = options['param'].split(':')
    const assetType = params[0]
    const assetCategory = options['type']
    
    if (assetCategory && !params[1])
    {
      print.error('assetId needs to be specified for "bond" type')
      return
    }
    if (assetCategory && !params[1])
    {
      print.error('num of units needs to be specified for "token" type')
      return
    }
    if (assetCategory === 'token' && isNaN(parseInt(params[1])))
    {
      print.error('num of units must be an integer for "token" type')
      return
    }
    
    const assetIdOrQuantity = (assetCategory === 'token') ? parseInt(params[1]) : params[1]
    
    const networkName = options['source-network']
    const netConfig = getNetworkConfig(networkName)
    if (!netConfig.connProfilePath || !netConfig.channelName || !netConfig.chaincode) {
        print.error(
            `Please use a valid --source-network. No valid environment found for ${options['source-network']} `
        )
        return
    }
    const channel = netConfig.channelName
    const contractName = process.env.DEFAULT_CHAINCODE
      ? process.env.DEFAULT_CHAINCODE
      : 'interop'
    const username = options['user']
    const { wallet, contract } = await fabricHelper({
        channel,
        contractName,
        connProfilePath: netConfig.connProfilePath,
        networkName,
        mspId: netConfig.mspId,
        logger,
        discoveryEnabled: true,
        userString: username
    })
    
    const userId = await wallet.get(username)
    const userCert = Buffer.from((userId).credentials.certificate).toString('base64')

    const pledgeAssetDetails = await getLocalAssetPledgeDetails({
        sourceNetworkName: networkName,
        pledgeId: options['pledge-id'],
        caller: username,
        ccType: assetCategory,
        logger: logger
    })
    
    const viewAddress = getReclaimViewAddress(assetCategory, assetType, assetIdOrQuantity,
        options['pledge-id'], userCert, networkName, pledgeAssetDetails.getRecipient(),
        pledgeAssetDetails.getRemotenetworkid(), pledgeAssetDetails.getExpirytimesecs()
    )
    if (viewAddress == "") {
        print.error(
            `Please use a valid --dest-network. No valid environment found for ${options['dest-network']} `
        )
        return
    }
    
    const [keyCert, keyCertError] = await handlePromise(
      getKeyAndCertForRemoteRequestbyUserName(wallet, username)
    )
    if (keyCertError) {
      print.error(`Error getting key and cert ${keyCertError}`)
      return
    }
    const spinner = print.spin(`Starting Interop Query for ClaimStatus in destination network`)
    const appChaincodeId = netConfig.chaincode
    const applicationFunction = (assetCategory === 'token') ? 'ReclaimTokenAsset' : 'ReclaimAsset'
    const { replaceIndices } = getChaincodeConfig(appChaincodeId, applicationFunction)
    const args = [options['pledge-id'], pledgeAssetDetails.getRecipient(), pledgeAssetDetails.getRemotenetworkid(), ""]
    let relayTlsCAFiles = []
    if (options['relay-tls-ca-files']) {
      relayTlsCAFiles = options['relay-tls-ca-files'].split(':')
    }
    try {
      const invokeObject = {
        channel,
        ccFunc: applicationFunction,
        ccArgs: args,
        contractName: appChaincodeId
      }
      console.log(invokeObject)
      const interopFlowResponse = await InteroperableHelper.interopFlow(
        //@ts-ignore this comment can be removed after using published version of interop-sdk
        contract,
        networkName,
        invokeObject,
        netConfig.mspId,
        netConfig.relayEndpoint,
        replaceIndices,
        [{
          address: viewAddress,
          Sign: true
        }],
        keyCert,
        false,
        options['relay-tls'] === 'true',
        relayTlsCAFiles
      )
      logger.info(
        `View from remote network: ${JSON.stringify(
          interopFlowResponse.views[0].toObject()
        )}. Interop Flow result: ${interopFlowResponse.result || 'successful'}`
      )
      const remoteValue = InteroperableHelper.getResponseDataFromView(interopFlowResponse.views[0])
      spinner.succeed(
        `Called Function ${applicationFunction}. With Args: ${invokeObject.ccArgs} ${remoteValue}`
      )
    } catch (e) {
      spinner.fail(`Error verifying and storing state`)
      logger.error(`Error verifying and storing state: ${e}`)
    }
    process.exit()
  }
}


function getReclaimViewAddress(assetCategory, assetType, assetIdOrQuantity, 
    pledgeId, pledgerCert, sourceNetwork, recipientCert,
    destNetwork, pledgeExpiryTimeSecs
) {
    const destNetConfig = getNetworkConfig(destNetwork)
    if (!destNetConfig.connProfilePath || !destNetConfig.channelName || !destNetConfig.chaincode) {
        return ""
    }
    let address = destNetConfig.relayEndpoint + '/' + destNetwork + '/' +
        destNetConfig.channelName + ':' + destNetConfig.chaincode + ':';

    if (assetCategory === 'bond') {
        address = address + 'GetAssetClaimStatus';
    } else if (assetCategory === 'token') {
        address = address + 'GetTokenAssetClaimStatus';
    } else {
        console.log('Unecognized asset category:', assetCategory);
        process.exit(1);
    }
    address = address + ':' + pledgeId + ':' + assetType + ':' + assetIdOrQuantity + ':' +
        recipientCert + ':' + pledgerCert + ':' + sourceNetwork + ':' + pledgeExpiryTimeSecs;

    return address;
}

module.exports = command

