import React, { useEffect, useState } from "react";
import twitterLogo from "./assets/twitter-logo.svg";
import "./App.css";
import idl from "./idl.json";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, Provider, web3 } from "@project-serum/anchor";
import kp from "./keypair.json";

// Constants
// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

// Create a keypair for the account that will hold the GIF data.
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret);

// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl("devnet");

// Controls how we want to acknowledge when a transaction is "done".
const opts = {
  preflightCommitment: "processed",
};

const TWITTER_HANDLE = "trizwit";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const App = () => {
  // State
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [inputFiltValue, setInputFiltValue] = useState("");
  const [recAddress, setRecAddress] = useState("");
  const [docList, setDocList] = useState([]);
  const [filterList, setFilterList] = useState([]);
  const [searchButton, setSearchButton] = useState(null);

  // Actions
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom wallet found!");
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            "Connected with Public Key:",
            response.publicKey.toString()
          );

          /*
           * Set the user's publicKey in state to be used later!
           */
          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert("Solana object not found! Get a Phantom Wallet 👻");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log("Connected with Public Key:", response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };
  const sendDoc = async () => {
    if (inputValue.length === 0) {
      console.log("No doc link given!");
      return;
    }
    setInputValue("");
    console.log("Doc link:", inputValue);
    if (recAddress.length === 0) {
      console.log("No receiver adrress given!");
      return;
    }
    setRecAddress("");
    console.log("receiver:", recAddress);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addDoc(inputValue, recAddress, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("Doc successfully sent to program", inputValue);

      await getDocList();
    } catch (error) {
      console.log("Error sending Doc:", error);
    }
  };

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };
  const onInputFiltChange = (event) => {
    const { value } = event.target;
    setInputFiltValue(value);
  };
  const onRecAddressChange = (event) => {
    const { value } = event.target;
    setRecAddress(value);
  };
  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection,
      window.solana,
      opts.preflightCommitment
    );
    return provider;
  };
  const createDocAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping");
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      });
      console.log(
        "Created a new BaseAccount w/ address:",
        baseAccount.publicKey.toString()
      );
      await getDocList();
    } catch (error) {
      console.log("Error creating BaseAccount account:", error);
    }
  };
  const getDocList = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(
        baseAccount.publicKey
      );

      console.log("Got the account", account);
      setDocList(account.docList);
    } catch (error) {
      console.log("Error in getDocList: ", error);
      setDocList(null);
    }
  };
  const search = async () => {
    setSearchButton(true);
    console.log(searchButton);
  };
  const exitSearch = async () => {
    setSearchButton(false);
    console.log(searchButton);
  };
  const filterDoc = async () => {
    if (inputFiltValue.length === 0) {
      console.log("No doc link given!");
      return;
    }
    setInputFiltValue("");
    console.log("Doc link:", inputFiltValue);
    let dupdocList = docList;
    let filt = dupdocList.filter((it) => it.docLink.includes(inputFiltValue));
    setFilterList(filt);
  };

  const renderNotConnectedContainer = () => (
    <button
      type="submit"
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  const renderConnectedContainer = () => {
    // If we hit this, it means the program account hasn't been initialized.
    if (docList === null) {
      return (
        <div className="connected-container">
          <button
            className="cta-button submit-gif-button"
            onClick={createDocAccount}
          >
            Do One-Time Initialization For PinDown Program Account
          </button>
        </div>
      );
    }
    // Otherwise, we're good! Account exists. User can submit GIFs.
    else {
      if (!searchButton) {
        return (
          <>
            <button
              type="submit"
              className="cta-button cta-position submit-gif-button"
              onClick={search}
            >
              Verify a Doc
            </button>

            <div className="connected-container">
              <h2>Submit document link and receiver address</h2>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendDoc();
                }}
              >
                <input
                  type="text"
                  placeholder="Enter doc link!"
                  value={inputValue}
                  onChange={onInputChange}
                />
                <input
                  type="text"
                  placeholder="Enter receiver address!"
                  value={recAddress}
                  onChange={onRecAddressChange}
                />
                <button type="submit" className="cta-button submit-gif-button">
                  Submit
                </button>
              </form>
              <div className="gif-grid">
                {/* We use index as the key instead, also, the src is now item.gifLink */}
                {docList.map((item, index) => (
                  <div className="gif-item" key={index}>
                    <img src={item.docLink} />

                    <p>
                      <span>Issuer : </span>
                      {item.userAddress.toString()}
                    </p>
                    <p>
                      <span>Receiver: </span>
                      {item.destAddr.toString()}
                    </p>
                    <p>
                      <span>Doc Link: </span>
                      {item.docLink}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      } else {
        return (
          <>
            <button
              type="submit"
              className="cta-button cta-position submit-gif-button"
              onClick={exitSearch}
            >
              Back
            </button>

            <div className="connected-container">
              <h2>Search document by link </h2>
              <form>
                <input
                  type="text"
                  placeholder="Enter doc link!"
                  value={inputFiltValue}
                  onChange={onInputFiltChange}
                />
                {/* <input
                  type="text"
                  placeholder="Enter receiver address!"
                  value={recAddress}
                  onChange={onRecAddressChange}
                /> */}
                <button
                  type="submit"
                  onClick={(event) => {
                    event.preventDefault();
                    filterDoc();
                  }}
                  className="cta-button submit-gif-button"
                >
                  Search
                </button>
              </form>
              <div className="gif-grid">
                {/* We use index as the key instead, also, the src is now item.gifLink */}
                {filterList.map((item, index) => (
                  <div className="gif-item" key={index}>
                    <img src={item.docLink} />

                    <p>
                      <span>Issuer : </span>
                      {item.userAddress.toString()}
                    </p>
                    <p>
                      <span>Receiver: </span>
                      {item.destAddr.toString()}
                    </p>
                    <p>
                      <span>Doc Link: </span>
                      {item.docLink}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      }
    }
  };

  // UseEffects
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  useEffect(() => {
    if (walletAddress) {
      console.log("Fetching Doc list...");
      getDocList();
    }
  }, [walletAddress]);

  return (
    <div className="App">
      {/* This was solely added for some styling fanciness */}

      <div className={walletAddress ? "authed-container" : "container"}>
        <div className="header-container">
          <p className="header">PinDown 📌</p>
          <p className="sub-text">
            Your Solana based document certifier. View the legit source and
            destination of any certificate✨
          </p>
          {/* Add the condition to show this only if we don't have a wallet address */}
          {!walletAddress && renderNotConnectedContainer()}
          {/* We just need to add the inverse here! */}
          {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built by @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
