import { providers, BigNumber, Contract, utils } from "ethers";
import Head from 'next/head'
import React, { useEffect, useRef, useState } from 'react';
import styles from '../styles/Home.module.css';
import Web3Modal from "web3modal";
import {
  NFT_CONTRACT_ABI,
  NFT_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ABI,
  TOKEN_CONTRACT_ADDRESS,
} from "../constants";

export default function Home() {
  const zero = BigNumber.from(0);
  // walletConnected keeps track of whether the user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);
  const web3ModalRef = useRef();
  // tokensMinted is the total number of tokens that have been minted till now out of 10000(max total supply)
  const [tokensMinted, setTokensMinted] = useState(zero);
  // balanceOfCryptoDevTokens keeps track of number of Crypto Dev tokens owned by an address
  const [balanceOfCryptoDevTokens, setBalanceOfCryptoDevTokens] = useState(zero);
  // amount of the tokens that the user wants to mint
  const [tokenAmount, setTokenAmount] = useState(zero);
  // loading is set to true when we are waiting for a transaction to get mined
  const [loading, setLoading] = useState(false);
  // tokensToBeClaimed keeps track of the number of tokens that can be claimed
  // based on the Crypto Dev NFT's held by the user for which they havent claimed the tokens
  const [tokensToBeClaimed, setTokensToBeClaimed] = useState(zero);
  // isOwner gets the owner of the contract through the signed address.
  const [isOwner, setIsOwner] = useState(false);

  //Returns a Provider or Signer object representing the Ethereum RPC with or without the
  //signing capabilities of metamask attached.
  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();

    if (chainId !== 5) {
      window.alert("Change the network to Goerli");
      throw new Error("Change network to Goerli");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  //connectWallet: Connects the MetaMask wallet
  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
    
  };

   /**
   * getTokensToBeClaimed: checks the balance of tokens that can be claimed by the user
   */
  const getTokensToBeClaimed = async () => {
    try {
      const provider = await getProviderOrSigner();

      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        provider
      );
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );

      const signer = await getProviderOrSigner(true);
      const address = await signer.getAddress();
      const balance = await nftContract.balanceOf(address);

      if (balance === zero) {
        setTokensToBeClaimed(zero);
      } else {
        var amount = 0;
        for (var i =0; i < balance; i++) {
          const tokenId = await nftContract.tokenOfOwnerByIndex(address, i);
          const claimed = await tokenContract.tokenIdsClaimed(tokenId);
          if (!claimed) {
            amount++;
          }
        }

        setTokensToBeClaimed(BigNumber.from(amount));
      }

    } catch (err) {
      console.error(err);
      setTokensToBeClaimed(zero);
    }
  }

  /**
   * getBalanceOfCryptoDevTokens: checks the balance of Crypto Dev Tokens's held by an address
   */
  const getBalanceOfCryptoDevTokens = async () => {
    try {
      const provider = await getProviderOrSigner();
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      const signer = await getProviderOrSigner(true);
      const address = await signer.getAddress();
      const balance = await tokenContract.balanceOf(address);
      setBalanceOfCryptoDevTokens(balance);
      
    } catch (err) {
      console.error(err);
    }
  };

   /**
   * getTotalTokensMinted: Retrieves how many tokens have been minted till now
   * out of the total supply
   */
  const getTotalTokensMinted = async () => {
    try {
      const provider = await getProviderOrSigner();
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );

      const _tokensMinted = await tokenContract.totalSupply();
      setTokensMinted(_tokensMinted);
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * mintCryptoDevToken: mints `amount` number of tokens to a given address
   */
  const mintCryptoDevToken = async (amount) => {
    try {
      const signer = await getProviderOrSigner(true);
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );

      const value = 0.001 * amount;
      const tx = await tokenContract.mint(amount, {
        value: utils.parseEther(value.toString()),
      });
      setLoading(true);

      await tx.wait();
      setLoading(false);
      window.alert("Successfully minted Crypto Dev Tokens");
      await getBalanceOfCryptoDevTokens();
      await getTotalTokensMinted();
      await getTokensToBeClaimed();
      
    } catch (err) {
      console.error(err);
    }
  };

   /**
   * claimCryptoDevTokens: Helps the user claim Crypto Dev Tokens
   */
  const claimCryptoDevTokens = async () => {
    try {
      const signer = await getProviderOrSigner(true)
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );
      const tx = await tokenContract.claim();
      setLoading(true);
      await tx.wait();
      setLoading(false);
      window.alert("Successfully claimed Crypto Dev Tokens");
      await getBalanceOfCryptoDevTokens();
      await getTotalTokensMinted();
      await getTokensToBeClaimed();

    } catch (err) {
      console.error(err);
    }
  }

   /**
   * getOwner: gets the contract owner by connected address
   */
  const getOwner = async () => {
    try {
      const provider = await getProviderOrSigner();
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );

      const _owner = await tokenContract.owner();
      const signer = await getProviderOrSigner(true);
      const address = await signer.getAddress();
      if (address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  /**
   * withdrawCoins: withdraws ether and tokens by calling
   * the withdraw function in the contract
   */
  const withdrawCoins = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );

      const tx = await tokenContract.withdraw();
      setLoading(true);
      await tx.wait();
      setLoading(false);
      await getOwner();
    } catch (err) {
      console.error(err);
    }
  };

  /*
        renderButton: Returns a button based on the state of the dapp
      */
  const renderButton = () => {
    if (loading) {
      return (
        <div>
          <button className={styles.button}>Loading...</button>
        </div>
      );
    }

    if (walletConnected && isOwner) {
      return (
        <div>
          <button className={styles.button1} onClick={withdrawCoins}>
            Withdraw Coins
          </button>
        </div>
      );
    }

    if (tokensToBeClaimed > 0) {
      return (
        <div>
          <div className={styles.description}>
            {tokensToBeClaimed * 10} Tokens can be claimed!
          </div>
          <button className={styles.button} onClick={claimCryptoDevTokens}>
            Claim Tokens
          </button>
        </div>
      )
    }
    return (
      <div style={{ display: "flex-col" }}>
        <div>
          <input 
            type="number" 
            placeholder="Amount of Tokens"
            onChange={(e) => setTokenAmount(BigNumber.from(e.target.value))}
          />
          <button 
            className={styles.button}
            disabled={!(tokenAmount > 0)}
            onClick={() => mintCryptoDevToken(tokenAmount)}
          >
            Mint Tokens
          </button>
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "goerli",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      getBalanceOfCryptoDevTokens();
      getTotalTokensMinted();
      getTokensToBeClaimed();
    }
  }, []);


  return (
    <div>
      <Head>
        <title>Crypto Devs ICO</title>
        <meta name="description" content="ICO-dApp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}> Welcome to Crypto Devs ICO</h1>
          <div className={styles.description}>
            You can claim or mint Crypto Dev tokens here
          </div>
          {
            walletConnected ? (
              <div>
                <div className={styles.description}>
                  You have minted {utils.formatEther(balanceOfCryptoDevTokens)} Crypto Dev Tokens
                </div>
                <div className={styles.description}>
                  Overall {utils.formatEther(tokensMinted)}/10000 have been minted
                </div>
                {renderButton()}
              </div> 
            ): (
              <button onClick={connectWallet} className={styles.button}>
                Connect your Wallet
              </button>
            )
          }

        </div>
        <div>
          <img className={styles.image} src="./0.svg" />
        </div>
      </div>
      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
  );
}
