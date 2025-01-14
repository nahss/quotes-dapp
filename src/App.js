
import './App.css';

import { NavigationBar } from './components/navBar';
import { AddQuote } from './components/addquote';
import { useState, useEffect, useCallback } from "react";


import Web3 from "web3";
import { newKitFromWeb3 } from "@celo/contractkit";
import BigNumber from "bignumber.js";

import IERC from "./contracts/IERC.abi.json";
import { Quotes } from './components/quotes';
import {ERC20_DECIMALS, helpfullnessPrice, contractAddress, cUSDContractAddress} from "./constants"




function App() {
  const [contract, setcontract] = useState(null);
  const [address, setAddress] = useState(null);
  const [kit, setKit] = useState(null);
  const [cUSDBalance, setcUSDBalance] = useState(0);
  const [quotes, setQuotes] = useState([]);
  


  const connectToWallet = async () => {
    if (window.celo) {
      try {
        await window.celo.enable();
        const web3 = new Web3(window.celo);
        let kit = newKitFromWeb3(web3);

        const accounts = await kit.web3.eth.getAccounts();
        const user_address = accounts[0];

        kit.defaultAccount = user_address;

        await setAddress(user_address);
        await setKit(kit);
      } catch (error) {
        console.log(error);
      }
    } else {
      alert("Error Occurred");
    }
  };

  const getBalance = useCallback(async () => {
    try {
      const balance = await kit.getTotalBalance(address);
      const USDBalance = balance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2);

      const contract = new kit.web3.eth.Contract(quotes, contractAddress);
      setcontract(contract);
      setcUSDBalance(USDBalance);
    } catch (error) {
      console.log(error);
    }
  }, [address, kit]);



  const getQuotes = useCallback(async () => {
    const quotesLength = await contract.methods.getQuotesLength().call();
    const quotes = [];
    for (let index = 0; index < quotesLength; index++) {
      let _quotes = new Promise(async (resolve) => {
      let quote = await contract.methods.readQuotes(index).call();

        resolve({
          index: index,
          owner: quote[0],
          text: quote[1],
          helpfull: quote[2], 
        });
      });
      quotes.push(_quotes);
    }


    const _quotes = await Promise.all(quotes);
    setQuotes(_quotes);
  }, [contract]);


  const addQuote = async (
    _text
  ) => {
    try {
      await contract.methods
        .writeQuote(_text)
        .send({ from: address });
      getQuotes();
    } catch (error) {
      alert(error);
    }
  };

  const editQuote = async (
    _index, 
    _text
  ) => {
    try {
      await contract.methods
        .editQuote(_index, _text)
        .send({ from: address });
      getQuotes();
    } catch (error) {
      alert(error);
    }
  };


  const addHelpfullness = async (_index) => {
    try {
      const cUSDContract = new kit.web3.eth.Contract(IERC, cUSDContractAddress);
      const cost = new BigNumber(helpfullnessPrice)
        .shiftedBy(ERC20_DECIMALS)
        .toString();
      await cUSDContract.methods
        .approve(contractAddress, cost)
        .send({ from: address });
      await contract.methods.increaseHelpfullness(_index, cost).send({ from: address });
      getQuotes();
      getBalance();
      alert("you have successfully donated to the writer");
    } catch (error) {
      alert(error);
    }};


  useEffect(() => {
    connectToWallet();
  }, []);

  useEffect(() => {
    if (kit && address) {
      getBalance();
    }
  }, [kit, address, getBalance]);

  useEffect(() => {
    if (contract) {
      getQuotes();
    }
  }, [contract, getQuotes]);
  
  return (
    <div className="App">
      <NavigationBar cUSDBalance={cUSDBalance} />
      <Quotes userWallet={address} quotes={quotes} editQuote={editQuote} addHelpfullness={addHelpfullness}/>
      <AddQuote addQuote={addQuote} />
    </div>
  );
}

export default App;
