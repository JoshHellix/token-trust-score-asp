@echo off
set EXE=%USERPROFILE%\onchainos-bin\onchainos.exe
%EXE% agent validate-listing --role asp --name "TokenGuard" --description "Pay-per-call token risk scoring service returning a composite 0-100 on-chain trust score with structured verdict and evidence for any EVM token." --service "[{""serviceName"":""Token Trust Score"",""serviceDescription"":""Composite 0-100 on-chain trust score with BLOCK/SKIP/WATCH/PASS verdict and evidence for any EVM token.
Provide a token contract address and chain (ethereum/bsc/base/arbitrum/polygon/xlayer)."",""serviceType"":""A2MCP"",""fee"":""0.01"",""endpoint"":""https://tokenguard-p3pk.onrender.com/v1/trust-score""}]"
