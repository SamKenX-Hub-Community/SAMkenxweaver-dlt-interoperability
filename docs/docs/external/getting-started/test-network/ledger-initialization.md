---
id: ledger-initialization
title: Ledger Initialization
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

Once the two Fabric networks and the Corda network are up and running along with their associated relays and drivers, we must initialize states in those networks to prepare them for interoperation. For the Fabric networks, this involves recording state in the channel ledgers, and for the Corda network, in the nodes' vaults. The configuration and bootstrapping takes different form depending on what [interoperability mode](../../interoperability-modes.md) you wish to test.

## Preparation for Data Sharing

Follow the below instructions to prepare your networks for data sharing tests.

### Initializing the Fabric Networks

We use the Fabric CLI (`fabric-cli`) built earlier (in `samples/fabric/fabric-cli` and `samples/fabric/go-cli`) for this purpose.

#### Configuring the Fabric CLI

During bootstrap, the ledgers in both `network1` and `network2` must be populated with the following information scoped by the interoperation chaincode:
- Access control policies governing requests from foreign networks
- Security group info for foreign networks (i.e., identities of network units and their membership providers' certificate chains)
- Verification policies for proofs supplied by foreign networks
Knowledge of foreign networks that must be configured in this stage is as follows:
- `network1` has policies and security group info for `network2` and `Corda_Network`
- `network2` has policies and security group info for `network1` and `Corda_Network`
(_`Corda_Network` will be launched later._)
The ledgers must also be populated with sample key-value pairs for testing interoperation flows, scoped by the sample application chaincode.

Prepare `fabric-cli` for configuration suitably as follows.
- Navigate to the `samples/fabric/fabric-cli` (for the Node.js version) or the `samples/fabric/go-cli` (for the Golang version) folder.
- Create a `config.json` file by copying the `config.template.json` and setting (or adding or removing) suitable values:
  * For each network, the relay port and connection profile paths are specified using the keys `relayPort` and `connProfilePath` respectively.
    - Replace `<PATH-TO-WEAVER>` with the absolute path location of the `weaver-dlt-interoperability` clone folder.
    - Otherwise, leave the default values unchanged.
- Create a `chaincode.json` file by copying the `chaincode.json.template` and leaving the default values unchanged. This file specified the arguments of the transaction to be locally invoked after fetching a remote view.
- Create a `.env` file by copying `.env.template` and setting the following parameter values:
  * If Relays and Drivers are deployed in the host machine:
    ```
    MEMBER_CREDENTIAL_FOLDER=<PATH-TO-WEAVER>/samples/fabric/fabric-cli/src/data/credentials
    DEFAULT_APPLICATION_CHAINCODE=<chaincode-name>
    DEFAULT_APPLICATION_FUNC=<function-name>
    CONFIG_PATH=./config.json
    CHAINCODE_PATH=./chaincode.json
    ```
  * If Relays and Drivers are deployed in the Docker containers:
    ```
    MEMBER_CREDENTIAL_FOLDER=<PATH-TO-WEAVER>/samples/fabric/fabric-cli/src/data/credentials_docker
    DEFAULT_APPLICATION_CHAINCODE=<chaincode-name>
    DEFAULT_APPLICATION_FUNC=<function-name>
    CONFIG_PATH=./config.json
    CHAINCODE_PATH=./chaincode.json
    ```
  * In each case, replace `<PATH-TO-WEAVER>` with the location of your clone of Weaver and `<chaincode-name>` with the name of the deployed chaincode, either `simpleasset` or `simpleassetwithacl`.
  * If `simplestate` is deployed, set `<function-name>` to `Create`, and if `simpleassetwithacl` if deployed, set `<function-name>` to `CreateFromRemote`.
  * Leave the default values unchanged for the other parameters.
- Run the following command:
  ```bash
  ./bin/fabric-cli env set-file ./.env
  ```
- _Note_: If you don't set the `CONFIG_PATH` environment variable in `.env` appropriately, then you should also run:
  ```bash
  ./bin/fabric-cli config set-file ./config.json
  ```

#### Bootstrapping Network and Application State

Finally, to prepare both `network1` and `network2` for interoperation, run:

```bash
./bin/fabric-cli configure all network1 network2
```

### Initializing the Corda Network

Once the Corda network is launched, the client application (built earlier) needs to be exercised to generate network (ledger) state in preparation to test interoperation flows.

#### Bootstrapping Network and Application State
Just as we did for either Fabric network, the Corda network ledger (or _vault_ on each node) must be initialized with access control policies, verification policies, and security group information for the two Fabric networks. Further, sample key-value pairs need to be recorded so we can later share them with a Fabric network via an interoperation flow.

Bootstrap the Corda network and application states as follows:
- Navigate to the `samples/corda/corda-simple-application` folder.
- Run the following: 
  * If Relays and Drivers are deployed in the host machine:
    ```bash
    make initialise-vault
    ```
  * If Relays and Drivers are deployed in the Docker containers:
    ```bash
    make initialise-vault-docker
    ```

### Next Steps

The test networks are now configured and their ledgers are initialized. You can now run the [data sharing flows](../interop/data-sharing.md).


## Preparation for Asset Exchange

Follow the below instructions to prepare your networks for asset exchange tests.

### Initializing the Fabric Networks

We use the Fabric CLI (`fabric-cli`) built earlier (in `samples/fabric/fabric-cli` and `samples/fabric/go-cli`) for this purpose.

#### Configuring the Fabric CLI

The ledgers must be populated with sample key-value pairs for testing interoperation flows, scoped by the sample application chaincode.

Prepare `fabric-cli` for configuration suitably as follows.
- Navigate to the `samples/fabric/fabric-cli` (for the Node.js version) or the `samples/fabric/go-cli` (for the Golang version) folder.
- Create a `config.json` file by copying the `config.template.json` and setting (or adding or removing) suitable values:
  * For each network, the relay port and connection profile paths are specified using the keys `relayPort` and `connProfilePath` respectively.
    - Replace `<PATH-TO-WEAVER>` with the absolute path location of the `weaver-dlt-interoperability` clone folder.
    - Set the `chaincode` attribute in each network to the deployed chaincode name (`simpleasset` or `simpleassetandinterop` or `simpleassettransfer`).
    - Otherwise, leave the default values unchanged.
- Create a `.env` file by copying `.env.template` and setting following parameter values:
  * If Relays and Drivers are deployed in the host machine:
    ```
    MEMBER_CREDENTIAL_FOLDER=<PATH-TO-WEAVER>/samples/fabric/fabric-cli/src/data/credentials
    CONFIG_PATH=./config.json
    ```
  * If Relays and Drivers are deployed in the Docker containers:
    ```
    MEMBER_CREDENTIAL_FOLDER=<PATH-TO-WEAVER>/samples/fabric/fabric-cli/src/data/credentials_docker
    CONFIG_PATH=./config.json
    ```
  * In each case, replace `<PATH-TO-WEAVER>` with the location of your clone of Weaver.
  * Leave the default values unchanged for the other parameters.
- Run the following command:
  ```bash
  ./bin/fabric-cli env set-file ./.env
  ```
- _Note_: If you don't set the `CONFIG_PATH` environment variable in `.env` appropriately, then you should also run:
  ```bash
  ./bin/fabric-cli config set-file ./config.json
  ```

#### Bootstrapping Network and Application State

Finally, to prepare both `network1` and `network2` for interoperation, run:

```bash
./scripts/initAsset.sh
```

### Next Steps

The test networks are now configured and their ledgers are initialized. You can now run the [asset exchange flows](../interop/asset-exchange.md).


## Preparation for Asset Transfer

Follow the below instructions to prepare your networks for asset exchange tests.

### Initializing the Fabric Networks

We use the Fabric CLI (`fabric-cli`) built earlier (in `samples/fabric/fabric-cli` and `samples/fabric/go-cli`) for this purpose.

#### Configuring the Fabric CLI

During bootstrap, the ledgers in both `network1` and `network2` must be populated with the following information scoped by the interoperation chaincode:
- Access control policies governing requests from foreign networks
- Security group info for foreign networks (i.e., identities of network units and their membership providers' certificate chains)
- Verification policies for proofs supplied by foreign networks
Knowledge of foreign networks that must be configured in this stage is as follows:
- `network1` has policies and security group info for `network2` and `Corda_Network`
- `network2` has policies and security group info for `network1` and `Corda_Network`
(_The Corda sample application doesn't support asset transfer yet, but there is no harm in including it above._)
The ledgers must also be populated with sample key-value pairs for testing interoperation flows, scoped by the sample application chaincode.

Prepare `fabric-cli` for configuration suitably as follows.
- Navigate to the `samples/fabric/fabric-cli` folder (_the Go CLI doesn't support asset transfer yet_).
- Create a `config.json` file by copying the `config.template.json` and setting (or adding or removing) suitable values:
  * For each network, the relay port and connection profile paths are specified using the keys `relayPort` and `connProfilePath` respectively.
    - Replace `<PATH-TO-WEAVER>` with the absolute path location of the `weaver-dlt-interoperability` clone folder.
    - Set the `chaincode` attribute in each network to `simpleassettransfer`.
    - Set the `aclPolicyPrincipalType` attribute in `network2` to `ca`.
    - Otherwise, leave the default values unchanged.
- Create a `.env` file by copying `.env.template` and setting the following parameter values:
  * If Relays and Drivers are deployed in the host machine:
    ```
    MEMBER_CREDENTIAL_FOLDER=<PATH-TO-WEAVER>/samples/fabric/fabric-cli/src/data/credentials
    DEFAULT_APPLICATION_CHAINCODE=simpleassettransfer
    CONFIG_PATH=./config.json
    CHAINCODE_PATH=./chaincode.json
    ```
  * If Relays and Drivers are deployed in the Docker containers:
    ```
    MEMBER_CREDENTIAL_FOLDER=<PATH-TO-WEAVER>/samples/fabric/fabric-cli/src/data/credentials_docker
    DEFAULT_APPLICATION_CHAINCODE=simpleassettransfer
    CONFIG_PATH=./config.json
    CHAINCODE_PATH=./chaincode.json
    ```
  * In each case, replace `<PATH-TO-WEAVER>` with the location of your clone of Weaver.
  * Leave the default values unchanged for the other parameters.
- Run the following command:
  ```
  ./bin/fabric-cli env set-file ./.env
  ```
- _Note_: If you don't set the `CONFIG_PATH` environment variable in `.env` appropriately, then you should also run:
  ```
  ./bin/fabric-cli config set-file ./config.json
  ```

#### Bootstrapping Network and Application State

Create appropriate access control and verification policies for `network1` and `network2` by running:

```bash
./bin/fabric-cli configure create all --local-network=network1
./bin/fabric-cli configure create all --local-network=network2
```

Load access control and verification policies onto the ledgers of `network1` and `network2` by running:

```bash
./bin/fabric-cli configure network --local-network=network1
./bin/fabric-cli configure network --local-network=network2
```

Initialize bond and token asset states and ownerships on the `network1` ledger by running the following (this step will also create a user `alice` in `network1` and a user `bob` in `network2`):

```bash
./scripts/initAssetsForTransfer.sh
```

### Next Steps

The test networks are now configured and their ledgers are initialized. You can now run the [asset transfer flows](../interop/asset-transfer.md).
