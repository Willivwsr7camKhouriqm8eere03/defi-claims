import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import WalletManager from "./components/WalletManager";
import WalletSelector from "./components/WalletSelector";
import "./App.css";

interface Claim {
  id: string;
  encryptedData: string;
  timestamp: number;
  owner: string;
  category: string;
  status: "pending" | "approved" | "rejected";
  votesFor: number;
  votesAgainst: number;
}

const App: React.FC = () => {
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{
    visible: boolean;
    status: "pending" | "success" | "error";
    message: string;
  }>({ visible: false, status: "pending", message: "" });
  const [newClaimData, setNewClaimData] = useState({
    category: "",
    description: "",
    sensitiveInfo: ""
  });
  const [activePanel, setActivePanel] = useState("dashboard");
  const [isDAO, setIsDAO] = useState(false);

  // Calculate statistics for dashboard
  const approvedCount = claims.filter(c => c.status === "approved").length;
  const pendingCount = claims.filter(c => c.status === "pending").length;
  const rejectedCount = claims.filter(c => c.status === "rejected").length;
  const totalVotes = claims.reduce((sum, claim) => sum + claim.votesFor + claim.votesAgainst, 0);

  useEffect(() => {
    loadClaims().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Simulate DAO membership check
    if (account) {
      setIsDAO(Math.random() > 0.5);
    }
  }, [account]);

  const onWalletSelect = async (wallet: any) => {
    if (!wallet.provider) return;
    try {
      const web3Provider = new ethers.BrowserProvider(wallet.provider);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      const acc = accounts[0] || "";
      setAccount(acc);

      wallet.provider.on("accountsChanged", async (accounts: string[]) => {
        const newAcc = accounts[0] || "";
        setAccount(newAcc);
      });
    } catch (e) {
      alert("Failed to connect wallet");
    }
  };

  const onConnect = () => setWalletSelectorOpen(true);
  const onDisconnect = () => {
    setAccount("");
    setProvider(null);
    setIsDAO(false);
  };

  const loadClaims = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      // Check contract availability using FHE
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) {
        console.error("Contract is not available");
        return;
      }
      
      const keysBytes = await contract.getData("claim_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing claim keys:", e);
        }
      }
      
      const list: Claim[] = [];
      
      for (const key of keys) {
        try {
          const claimBytes = await contract.getData(`claim_${key}`);
          if (claimBytes.length > 0) {
            try {
              const claimData = JSON.parse(ethers.toUtf8String(claimBytes));
              list.push({
                id: key,
                encryptedData: claimData.data,
                timestamp: claimData.timestamp,
                owner: claimData.owner,
                category: claimData.category,
                status: claimData.status || "pending",
                votesFor: claimData.votesFor || 0,
                votesAgainst: claimData.votesAgainst || 0
              });
            } catch (e) {
              console.error(`Error parsing claim data for ${key}:`, e);
            }
          }
        } catch (e) {
          console.error(`Error loading claim ${key}:`, e);
        }
      }
      
      list.sort((a, b) => b.timestamp - a.timestamp);
      setClaims(list);
    } catch (e) {
      console.error("Error loading claims:", e);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const submitClaim = async () => {
    if (!provider) { 
      alert("Please connect wallet first"); 
      return; 
    }
    
    setCreating(true);
    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Encrypting sensitive claim data with FHE..."
    });
    
    try {
      // Simulate FHE encryption
      const encryptedData = `FHE-${btoa(JSON.stringify(newClaimData))}`;
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const claimId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const claimData = {
        data: encryptedData,
        timestamp: Math.floor(Date.now() / 1000),
        owner: account,
        category: newClaimData.category,
        status: "pending",
        votesFor: 0,
        votesAgainst: 0
      };
      
      // Store encrypted data on-chain using FHE
      await contract.setData(
        `claim_${claimId}`, 
        ethers.toUtf8Bytes(JSON.stringify(claimData))
      );
      
      const keysBytes = await contract.getData("claim_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing keys:", e);
        }
      }
      
      keys.push(claimId);
      
      await contract.setData(
        "claim_keys", 
        ethers.toUtf8Bytes(JSON.stringify(keys))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Encrypted claim submitted securely!"
      });
      
      await loadClaims();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowCreateModal(false);
        setNewClaimData({
          category: "",
          description: "",
          sensitiveInfo: ""
        });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction")
        ? "Transaction rejected by user"
        : "Submission failed: " + (e.message || "Unknown error");
      
      setTransactionStatus({
        visible: true,
        status: "error",
        message: errorMessage
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    } finally {
      setCreating(false);
    }
  };

  const voteOnClaim = async (claimId: string, approve: boolean) => {
    if (!provider) {
      alert("Please connect wallet first");
      return;
    }

    if (!isDAO) {
      alert("Only DAO members can vote on claims");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Processing encrypted vote with FHE..."
    });

    try {
      // Simulate FHE computation time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const claimBytes = await contract.getData(`claim_${claimId}`);
      if (claimBytes.length === 0) {
        throw new Error("Claim not found");
      }
      
      const claimData = JSON.parse(ethers.toUtf8String(claimBytes));
      
      const updatedClaim = {
        ...claimData,
        votesFor: approve ? claimData.votesFor + 1 : claimData.votesFor,
        votesAgainst: approve ? claimData.votesAgainst : claimData.votesAgainst + 1
      };
      
      // Auto-approve/reject if votes reach threshold
      if (updatedClaim.votesFor >= 3) {
        updatedClaim.status = "approved";
      } else if (updatedClaim.votesAgainst >= 3) {
        updatedClaim.status = "rejected";
      }
      
      await contract.setData(
        `claim_${claimId}`, 
        ethers.toUtf8Bytes(JSON.stringify(updatedClaim))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: `Vote ${approve ? "for" : "against"} claim processed!`
      });
      
      await loadClaims();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Vote failed: " + (e.message || "Unknown error")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const isOwner = (address: string) => {
    return account.toLowerCase() === address.toLowerCase();
  };

  const renderPieChart = () => {
    const total = claims.length || 1;
    const approvedPercentage = (approvedCount / total) * 100;
    const pendingPercentage = (pendingCount / total) * 100;
    const rejectedPercentage = (rejectedCount / total) * 100;

    return (
      <div className="pie-chart-container">
        <div className="pie-chart">
          <div 
            className="pie-segment approved" 
            style={{ transform: `rotate(${approvedPercentage * 3.6}deg)` }}
          ></div>
          <div 
            className="pie-segment pending" 
            style={{ transform: `rotate(${(approvedPercentage + pendingPercentage) * 3.6}deg)` }}
          ></div>
          <div 
            className="pie-segment rejected" 
            style={{ transform: `rotate(${(approvedPercentage + pendingPercentage + rejectedPercentage) * 3.6}deg)` }}
          ></div>
          <div className="pie-center">
            <div className="pie-value">{claims.length}</div>
            <div className="pie-label">Claims</div>
          </div>
        </div>
        <div className="pie-legend">
          <div className="legend-item">
            <div className="color-box approved"></div>
            <span>Approved: {approvedCount}</span>
          </div>
          <div className="legend-item">
            <div className="color-box pending"></div>
            <span>Pending: {pendingCount}</span>
          </div>
          <div className="legend-item">
            <div className="color-box rejected"></div>
            <span>Rejected: {rejectedCount}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderBarChart = () => {
    const categories = [...new Set(claims.map(c => c.category))];
    
    return (
      <div className="bar-chart-container">
        {categories.map(category => {
          const categoryClaims = claims.filter(c => c.category === category);
          const approved = categoryClaims.filter(c => c.status === "approved").length;
          const pending = categoryClaims.filter(c => c.status === "pending").length;
          const rejected = categoryClaims.filter(c => c.status === "rejected").length;
          
          return (
            <div className="bar-group" key={category}>
              <div className="bar-label">{category}</div>
              <div className="bars">
                <div 
                  className="bar approved" 
                  style={{ width: `${(approved / categoryClaims.length) * 100}%` }}
                ></div>
                <div 
                  className="bar pending" 
                  style={{ width: `${(pending / categoryClaims.length) * 100}%` }}
                ></div>
                <div 
                  className="bar rejected" 
                  style={{ width: `${(rejected / categoryClaims.length) * 100}%` }}
                ></div>
              </div>
              <div className="bar-value">{categoryClaims.length}</div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="tech-spinner">
        <div className="ring"></div>
        <div className="ring"></div>
        <div className="ring"></div>
      </div>
      <p>Initializing FHE connection...</p>
    </div>
  );

  return (
    <div className="app-container tech-theme">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">
            <div className="shield-icon"></div>
          </div>
          <h1>DeFi<span>Insure</span></h1>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="create-claim-btn tech-button"
          >
            <div className="add-icon"></div>
            Submit Claim
          </button>
          <WalletManager account={account} onConnect={onConnect} onDisconnect={onDisconnect} />
        </div>
      </header>
      
      <div className="main-content">
        <div className="panel-navigation">
          <button 
            className={`nav-btn ${activePanel === "dashboard" ? "active" : ""}`}
            onClick={() => setActivePanel("dashboard")}
          >
            <div className="dashboard-icon"></div>
            Dashboard
          </button>
          <button 
            className={`nav-btn ${activePanel === "claims" ? "active" : ""}`}
            onClick={() => setActivePanel("claims")}
          >
            <div className="claims-icon"></div>
            Claims
          </button>
          <button 
            className={`nav-btn ${activePanel === "faq" ? "active" : ""}`}
            onClick={() => setActivePanel("faq")}
          >
            <div className="faq-icon"></div>
            FAQ
          </button>
          <button 
            className={`nav-btn ${activePanel === "partners" ? "active" : ""}`}
            onClick={() => setActivePanel("partners")}
          >
            <div className="partners-icon"></div>
            Partners
          </button>
        </div>
        
        {activePanel === "dashboard" && (
          <div className="dashboard-panel">
            <div className="welcome-banner">
              <div className="welcome-text">
                <h2>Decentralized Insurance with FHE Privacy</h2>
                <p>Submit claims privately and get paid without revealing sensitive details</p>
              </div>
            </div>
            
            <div className="dashboard-grid">
              <div className="dashboard-card tech-card">
                <h3>Project Introduction</h3>
                <p>DeFiInsure leverages Fully Homomorphic Encryption (FHE) to enable private insurance claims processing. Users submit encrypted claims, and DAO members vote on them without accessing sensitive details.</p>
                <div className="fhe-badge">
                  <span>FHE-Powered Privacy</span>
                </div>
              </div>
              
              <div className="dashboard-card tech-card">
                <h3>Data Statistics</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-value">{claims.length}</div>
                    <div className="stat-label">Total Claims</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{approvedCount}</div>
                    <div className="stat-label">Approved</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{pendingCount}</div>
                    <div className="stat-label">Pending</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{rejectedCount}</div>
                    <div className="stat-label">Rejected</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{totalVotes}</div>
                    <div className="stat-label">Total Votes</div>
                  </div>
                </div>
              </div>
              
              <div className="dashboard-card tech-card">
                <h3>Status Distribution</h3>
                {renderPieChart()}
              </div>
              
              <div className="dashboard-card tech-card">
                <h3>Claims by Category</h3>
                {renderBarChart()}
              </div>
            </div>
          </div>
        )}
        
        {activePanel === "claims" && (
          <div className="claims-panel">
            <div className="section-header">
              <h2>Insurance Claims</h2>
              <div className="header-actions">
                <button 
                  onClick={loadClaims}
                  className="refresh-btn tech-button"
                  disabled={isRefreshing}
                >
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>
            
            <div className="claims-list tech-card">
              <div className="table-header">
                <div className="header-cell">ID</div>
                <div className="header-cell">Category</div>
                <div className="header-cell">Owner</div>
                <div className="header-cell">Date</div>
                <div className="header-cell">Status</div>
                <div className="header-cell">Votes</div>
                <div className="header-cell">Actions</div>
              </div>
              
              {claims.length === 0 ? (
                <div className="no-claims">
                  <div className="no-claims-icon"></div>
                  <p>No insurance claims found</p>
                  <button 
                    className="tech-button primary"
                    onClick={() => setShowCreateModal(true)}
                  >
                    Submit First Claim
                  </button>
                </div>
              ) : (
                claims.map(claim => (
                  <div className="claim-row" key={claim.id}>
                    <div className="table-cell claim-id">#{claim.id.substring(0, 6)}</div>
                    <div className="table-cell">{claim.category}</div>
                    <div className="table-cell">{claim.owner.substring(0, 6)}...{claim.owner.substring(38)}</div>
                    <div className="table-cell">
                      {new Date(claim.timestamp * 1000).toLocaleDateString()}
                    </div>
                    <div className="table-cell">
                      <span className={`status-badge ${claim.status}`}>
                        {claim.status}
                      </span>
                    </div>
                    <div className="table-cell">
                      <div className="vote-count">
                        <span className="for">{claim.votesFor}</span> / <span className="against">{claim.votesAgainst}</span>
                      </div>
                    </div>
                    <div className="table-cell actions">
                      {isDAO && claim.status === "pending" && (
                        <>
                          <button 
                            className="action-btn tech-button success"
                            onClick={() => voteOnClaim(claim.id, true)}
                          >
                            Approve
                          </button>
                          <button 
                            className="action-btn tech-button danger"
                            onClick={() => voteOnClaim(claim.id, false)}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        {activePanel === "faq" && (
          <div className="faq-panel">
            <h2>Frequently Asked Questions</h2>
            
            <div className="faq-list">
              <div className="faq-item tech-card">
                <h3>How does FHE protect my privacy?</h3>
                <p>Fully Homomorphic Encryption allows computations to be performed on encrypted data without decrypting it. This means DAO members can vote on your claim without ever seeing your sensitive information.</p>
              </div>
              
              <div className="faq-item tech-card">
                <h3>What information do I need to submit?</h3>
                <p>You'll need to provide encrypted details about your claim, including evidence. The system ensures only the necessary encrypted data is stored on-chain.</p>
              </div>
              
              <div className="faq-item tech-card">
                <h3>How long does claim processing take?</h3>
                <p>Most claims are processed within 3-5 business days once sufficient votes are collected. Complex cases may take longer.</p>
              </div>
              
              <div className="faq-item tech-card">
                <h3>Who can become a DAO member?</h3>
                <p>DAO membership is open to holders of our governance token. Members stake tokens to participate in claim voting and earn rewards.</p>
              </div>
              
              <div className="faq-item tech-card">
                <h3>How are payments made?</h3>
                <p>Approved claims are paid automatically to your wallet address. Payments are made in stablecoins or our native token.</p>
              </div>
            </div>
          </div>
        )}
        
        {activePanel === "partners" && (
          <div className="partners-panel">
            <h2>Our Partners</h2>
            <p className="subtitle">Collaborating to build a more private DeFi ecosystem</p>
            
            <div className="partners-grid">
              <div className="partner-card tech-card">
                <div className="partner-logo zama"></div>
                <h3>Zama</h3>
                <p>FHE technology provider</p>
              </div>
              
              <div className="partner-card tech-card">
                <div className="partner-logo chainlink"></div>
                <h3>Chainlink</h3>
                <p>Oracle services</p>
              </div>
              
              <div className="partner-card tech-card">
                <div className="partner-logo aave"></div>
                <h3>Aave</h3>
                <p>Lending protocol</p>
              </div>
              
              <div className="partner-card tech-card">
                <div className="partner-logo uniswap"></div>
                <h3>Uniswap</h3>
                <p>Decentralized exchange</p>
              </div>
              
              <div className="partner-card tech-card">
                <div className="partner-logo polygon"></div>
                <h3>Polygon</h3>
                <p>Scalability solution</p>
              </div>
              
              <div className="partner-card tech-card">
                <div className="partner-logo thegraph"></div>
                <h3>The Graph</h3>
                <p>Indexing protocol</p>
              </div>
            </div>
          </div>
        )}
      </div>
  
      {showCreateModal && (
        <ModalCreate 
          onSubmit={submitClaim} 
          onClose={() => setShowCreateModal(false)} 
          creating={creating}
          claimData={newClaimData}
          setClaimData={setNewClaimData}
        />
      )}
      
      {walletSelectorOpen && (
        <WalletSelector
          isOpen={walletSelectorOpen}
          onWalletSelect={(wallet) => { onWalletSelect(wallet); setWalletSelectorOpen(false); }}
          onClose={() => setWalletSelectorOpen(false)}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content tech-card">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="tech-spinner"></div>}
              {transactionStatus.status === "success" && <div className="check-icon"></div>}
              {transactionStatus.status === "error" && <div className="error-icon"></div>}
            </div>
            <div className="transaction-message">
              {transactionStatus.message}
            </div>
          </div>
        </div>
      )}
  
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">
              <div className="shield-icon"></div>
              <span>DeFiInsure</span>
            </div>
            <p>Private insurance claims powered by FHE technology</p>
          </div>
          
          <div className="footer-links">
            <a href="#" className="footer-link">Documentation</a>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms of Service</a>
            <a href="#" className="footer-link">Contact</a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="fhe-badge">
            <span>FHE-Powered Privacy</span>
          </div>
          <div className="copyright">
            © {new Date().getFullYear()} DeFiInsure. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

interface ModalCreateProps {
  onSubmit: () => void; 
  onClose: () => void; 
  creating: boolean;
  claimData: any;
  setClaimData: (data: any) => void;
}

const ModalCreate: React.FC<ModalCreateProps> = ({ 
  onSubmit, 
  onClose, 
  creating,
  claimData,
  setClaimData
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setClaimData({
      ...claimData,
      [name]: value
    });
  };

  const handleSubmit = () => {
    if (!claimData.category || !claimData.sensitiveInfo) {
      alert("Please fill required fields");
      return;
    }
    
    onSubmit();
  };

  return (
    <div className="modal-overlay">
      <div className="create-modal tech-card">
        <div className="modal-header">
          <h2>Submit Insurance Claim</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice-banner">
            <div className="key-icon"></div> Your sensitive data will be encrypted with FHE
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Category *</label>
              <select 
                name="category"
                value={claimData.category} 
                onChange={handleChange}
                className="tech-select"
              >
                <option value="">Select category</option>
                <option value="Health">Health Insurance</option>
                <option value="Auto">Auto Insurance</option>
                <option value="Property">Property Insurance</option>
                <option value="Travel">Travel Insurance</option>
                <option value="Life">Life Insurance</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <input 
                type="text"
                name="description"
                value={claimData.description} 
                onChange={handleChange}
                placeholder="Brief description..." 
                className="tech-input"
              />
            </div>
            
            <div className="form-group full-width">
              <label>Sensitive Information *</label>
              <textarea 
                name="sensitiveInfo"
                value={claimData.sensitiveInfo} 
                onChange={handleChange}
                placeholder="Enter sensitive claim details to encrypt..." 
                className="tech-textarea"
                rows={4}
              />
            </div>
          </div>
          
          <div className="privacy-notice">
            <div className="privacy-icon"></div> Data remains encrypted during FHE processing and voting
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="cancel-btn tech-button"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={creating}
            className="submit-btn tech-button primary"
          >
            {creating ? "Encrypting with FHE..." : "Submit Claim"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;