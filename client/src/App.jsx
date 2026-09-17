import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import Hero from './components/Hero';
import AuthForm from './components/AuthForm';
import ErrorAlert from './components/ErrorAlert';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { parseJsonResponse, requestJson } from './api';
import { useAuth } from './context/AuthContext';

const blankPolicyForm = {
  policyNumber: '',
  holderName: '',
  type: 'auto',
  premium: '',
  status: 'active',
  effectiveDate: '',
  expirationDate: '',
};

const blankClaimForm = {
  claimNumber: '',
  policy: '',
  incidentDate: '',
  amount: '',
  description: '',
  status: 'submitted',
  assignedTo: '',
};

const blankNoteForm = {
  text: '',
};

const blankAuthForm = {
  name: '',
  email: '',
  password: '',
  role: 'adjuster',
};

const blankPolicyErrors = {
  policyNumber: '',
  holderName: '',
  type: '',
  premium: '',
  status: '',
  effectiveDate: '',
  expirationDate: '',
};

const blankClaimErrors = {
  claimNumber: '',
  policy: '',
  incidentDate: '',
  amount: '',
  description: '',
  status: '',
  assignedTo: '',
  text: '',
};

const blankAuthErrors = {
  name: '',
  email: '',
  password: '',
  role: '',
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const normalizeError = async (response, fallbackMessage) => {
  try {
    const body = await response.json();
    return body?.error || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
};

const hasErrors = (errors) => Object.values(errors).some(Boolean);

const validatePolicyForm = (value) => {
  const errors = { ...blankPolicyErrors };

  if (!String(value.policyNumber || '').trim()) {
    errors.policyNumber = 'Policy number is required.';
  }

  if (!String(value.holderName || '').trim()) {
    errors.holderName = 'Holder name is required.';
  }

  if (!['auto', 'home', 'life'].includes(String(value.type || ''))) {
    errors.type = 'Choose a valid policy type.';
  }

  if (value.premium === '' || Number.isNaN(Number(value.premium)) || Number(value.premium) < 0) {
    errors.premium = 'Premium must be a valid non-negative number.';
  }

  if (!['active', 'expired', 'cancelled'].includes(String(value.status || ''))) {
    errors.status = 'Choose a valid status.';
  }

  if (value.effectiveDate && !datePattern.test(String(value.effectiveDate))) {
    errors.effectiveDate = 'Effective date must be a valid date.';
  }

  if (value.expirationDate && !datePattern.test(String(value.expirationDate))) {
    errors.expirationDate = 'Expiration date must be a valid date.';
  }

  if (value.effectiveDate && value.expirationDate && value.expirationDate < value.effectiveDate) {
    errors.expirationDate = 'Expiration date cannot be before the effective date.';
  }

  return errors;
};

const validateClaimForm = (value) => {
  const errors = { ...blankClaimErrors };

  if (!String(value.claimNumber || '').trim()) {
    errors.claimNumber = 'Claim number is required.';
  }

  if (!String(value.policy || '').trim()) {
    errors.policy = 'Choose a linked policy.';
  }

  if (!datePattern.test(String(value.incidentDate || ''))) {
    errors.incidentDate = 'Incident date is required.';
  }

  if (value.amount === '' || Number.isNaN(Number(value.amount)) || Number(value.amount) < 0) {
    errors.amount = 'Amount must be a valid non-negative number.';
  }

  if (!String(value.description || '').trim()) {
    errors.description = 'Description is required.';
  }

  if (!['submitted', 'under-review', 'approved', 'denied', 'closed'].includes(String(value.status || ''))) {
    errors.status = 'Choose a valid claim status.';
  }

  if (value.assignedTo && String(value.assignedTo).trim().length > 80) {
    errors.assignedTo = 'Assigned to must be 80 characters or fewer.';
  }

  return errors;
};

const validateNoteForm = (value) => {
  const errors = { ...blankClaimErrors };

  if (!String(value.text || '').trim()) {
    errors.text = 'Note text is required.';
  }

  return errors;
};

const validateAuthForm = (mode, value) => {
  const errors = { ...blankAuthErrors };

  if (mode === 'register') {
    if (!String(value.name || '').trim()) {
      errors.name = 'Name is required.';
    } else if (String(value.name).trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    } else if (String(value.name).trim().length > 50) {
      errors.name = 'Name must be 50 characters or fewer.';
    }
  }

  if (!String(value.email || '').trim()) {
    errors.email = 'Email is required.';
  } else if (!emailPattern.test(String(value.email).trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!String(value.password || '')) {
    errors.password = 'Password is required.';
  } else if (String(value.password).length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  if (mode === 'register' && !['adjuster', 'admin'].includes(String(value.role || ''))) {
    errors.role = 'Choose a valid role.';
  }

  return errors;
};

function PolicyFormScreen({
  policies,
  cancelPolicyEdit,
  beginPolicyEdit,
  loadPolicyDetail,
  renderProtectedFrame,
  error,
  policyDetailError,
  policyDetailLoading,
  editingPolicyId,
  policyForm,
  handlePolicyChange,
  policyErrors,
  policySaving,
  updatePolicy,
  createPolicy,
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  useEffect(() => {
    let isActive = true;

    const prepareForm = async () => {
      if (!isEditMode) {
        cancelPolicyEdit();
        return;
      }

      const existingPolicy = policies.find((policy) => policy.id === id);
      if (existingPolicy) {
        beginPolicyEdit(existingPolicy);
        return;
      }

      const loadedPolicy = await loadPolicyDetail(id);
      if (isActive && loadedPolicy) {
        beginPolicyEdit(loadedPolicy);
      }
    };

    prepareForm();

    return () => {
      isActive = false;
    };
  }, [id, isEditMode, policies]);

  return renderProtectedFrame(
    <>
      <header className="section-header">
        <div>
          <span className="badge">{isEditMode ? 'Edit policy' : 'Create policy'}</span>
          <h1>{isEditMode ? 'Policy editor' : 'New policy'}</h1>
        </div>
        <div className="section-header__actions">
          <Link className="button button--soft" to="/policies">
            Back to policies
          </Link>
        </div>
      </header>

      <ErrorAlert message={error || policyDetailError} />

      {isEditMode && policyDetailLoading && editingPolicyId !== id ? <div className="loading-card">Loading policy...</div> : null}

      <section className="grid grid--single">
        <article className="panel">
          <form
            className="form-grid"
            onSubmit={async (event) => {
              const savedPolicy = isEditMode ? await updatePolicy(event) : await createPolicy(event);
              if (savedPolicy?.id) {
                navigate(`/policies/${savedPolicy.id}`);
              }
            }}
          >
            <label>
              <span>Policy number</span>
              <input name="policyNumber" value={policyForm.policyNumber} onChange={handlePolicyChange} aria-invalid={Boolean(policyErrors.policyNumber)} />
              {policyErrors.policyNumber ? <span className="field-error">{policyErrors.policyNumber}</span> : null}
            </label>
            <label>
              <span>Holder name</span>
              <input name="holderName" value={policyForm.holderName} onChange={handlePolicyChange} aria-invalid={Boolean(policyErrors.holderName)} />
              {policyErrors.holderName ? <span className="field-error">{policyErrors.holderName}</span> : null}
            </label>
            <label>
              <span>Policy type</span>
              <select name="type" value={policyForm.type} onChange={handlePolicyChange} aria-invalid={Boolean(policyErrors.type)}>
                <option value="auto">Auto</option>
                <option value="home">Home</option>
                <option value="life">Life</option>
              </select>
              {policyErrors.type ? <span className="field-error">{policyErrors.type}</span> : null}
            </label>
            <label>
              <span>Premium</span>
              <input name="premium" type="number" min="0" step="0.01" value={policyForm.premium} onChange={handlePolicyChange} aria-invalid={Boolean(policyErrors.premium)} />
              {policyErrors.premium ? <span className="field-error">{policyErrors.premium}</span> : null}
            </label>
            <label>
              <span>Status</span>
              <select name="status" value={policyForm.status} onChange={handlePolicyChange} aria-invalid={Boolean(policyErrors.status)}>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
              {policyErrors.status ? <span className="field-error">{policyErrors.status}</span> : null}
            </label>
            <label>
              <span>Effective date</span>
              <input name="effectiveDate" type="date" value={policyForm.effectiveDate} onChange={handlePolicyChange} aria-invalid={Boolean(policyErrors.effectiveDate)} />
              {policyErrors.effectiveDate ? <span className="field-error">{policyErrors.effectiveDate}</span> : null}
            </label>
            <label className="form-grid__wide">
              <span>Expiration date</span>
              <input name="expirationDate" type="date" value={policyForm.expirationDate} onChange={handlePolicyChange} aria-invalid={Boolean(policyErrors.expirationDate)} />
              {policyErrors.expirationDate ? <span className="field-error">{policyErrors.expirationDate}</span> : null}
            </label>
            <button className="button form-grid__wide" type="submit" disabled={policySaving}>
              {policySaving ? 'Saving...' : isEditMode ? 'Save policy changes' : 'Create policy'}
            </button>
          </form>
        </article>
      </section>
    </>,
  );
}

function PolicyDetailScreen({ policies, claims, loadPolicyDetail, renderProtectedFrame, policyDetail, policyDetailLoading, policyDetailError, deletePolicy, policyDeletingId }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [localPolicy, setLocalPolicy] = useState(null);

  useEffect(() => {
    const existingPolicy = policies.find((policy) => policy.id === id);
    if (existingPolicy) {
      setLocalPolicy(existingPolicy);
      return;
    }

    loadPolicyDetail(id).then((loaded) => setLocalPolicy(loaded));
  }, [id, policies]);

  const policy = localPolicy || policyDetail;
  const relatedClaims = claims.filter((claim) => claim.policy === id);

  return renderProtectedFrame(
    <>
      <header className="section-header">
        <div>
          <span className="badge">Policy detail</span>
          <h1>{policy?.policyNumber || 'Policy'}</h1>
        </div>
        <div className="section-header__actions">
          {policy ? (
            <Link className="button" to={`/policies/${policy.id}/edit`}>
              Edit policy
            </Link>
          ) : null}
          {policy ? (
            <button
              className="button button--ghost"
              type="button"
              onClick={async () => {
                const removed = await deletePolicy(id);
                if (removed) {
                  navigate('/policies');
                }
              }}
              disabled={policyDeletingId === id}
            >
              {policyDeletingId === id ? 'Deleting...' : 'Delete policy'}
            </button>
          ) : null}
          <Link className="button button--soft" to="/policies">
            Back to policies
          </Link>
        </div>
      </header>

      {policyDetailLoading ? <div className="loading-card">Loading policy...</div> : null}
      {policyDetailError ? <ErrorAlert message={policyDetailError} /> : null}

      {policy ? (
        <section className="cards">
          <article className="card dashboard-card">
            <div className="dashboard-card__header">
              <div>
                <h2>Policy summary</h2>
                <p>Protected detail fetched from the policies API.</p>
              </div>
              <span className="badge">{policy.status}</span>
            </div>
            <div className="dashboard-preview-item">
              <strong>{policy.policyNumber}</strong>
              <p>{policy.holderName}</p>
              <div className="task-meta">
                <span>{policy.type}</span>
                <span>${Number(policy.premium || 0).toFixed(2)}</span>
                <span>{policy.effectiveDate || 'No effective date'}</span>
                <span>{policy.expirationDate || 'No expiration date'}</span>
              </div>
            </div>
          </article>

          <article className="card dashboard-card dashboard-card--wide">
            <div className="dashboard-card__header">
              <div>
                <h2>Linked claims</h2>
                <p>Claims associated with this policy.</p>
              </div>
              <span className="badge">{relatedClaims.length}</span>
            </div>
            <div className="dashboard-preview-list">
              {relatedClaims.map((claim) => (
                <Link key={claim.id} to={`/claims/${claim.id}`} className="dashboard-preview-item">
                  <strong>{claim.claimNumber}</strong>
                  <p>{claim.description}</p>
                  <div className="task-meta">
                    <span>{claim.status}</span>
                    <span>{claim.incidentDate}</span>
                    <span>${Number(claim.amount || 0).toFixed(2)}</span>
                  </div>
                </Link>
              ))}
              {!relatedClaims.length ? <div className="empty">No claims are linked to this policy yet.</div> : null}
            </div>
          </article>
        </section>
      ) : null}
    </>,
  );
}

function ClaimFormScreen({
  claims,
  policies,
  cancelClaimEdit,
  beginClaimEdit,
  loadClaimDetail,
  renderProtectedFrame,
  error,
  claimDetailError,
  claimDetailLoading,
  editingClaimId,
  claimForm,
  handleClaimChange,
  claimErrors,
  claimSaving,
  updateClaim,
  createClaim,
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  useEffect(() => {
    let isActive = true;

    const prepareForm = async () => {
      if (!isEditMode) {
        cancelClaimEdit();
        return;
      }

      const existingClaim = claims.find((claim) => claim.id === id);
      if (existingClaim) {
        beginClaimEdit(existingClaim);
        return;
      }

      const loadedClaim = await loadClaimDetail(id);
      if (isActive && loadedClaim) {
        beginClaimEdit(loadedClaim);
      }
    };

    prepareForm();

    return () => {
      isActive = false;
    };
  }, [id, isEditMode, claims]);

  return renderProtectedFrame(
    <>
      <header className="section-header">
        <div>
          <span className="badge">{isEditMode ? 'Edit claim' : 'Create claim'}</span>
          <h1>{isEditMode ? 'Claim editor' : 'New claim'}</h1>
        </div>
        <div className="section-header__actions">
          <Link className="button button--soft" to="/claims">
            Back to claims
          </Link>
        </div>
      </header>

      <ErrorAlert message={error || claimDetailError} />

      {isEditMode && claimDetailLoading && editingClaimId !== id ? <div className="loading-card">Loading claim...</div> : null}

      <section className="grid grid--single">
        <article className="panel">
          {!policies.length ? <div className="empty">Create a policy first so the claim can link to it.</div> : null}
          <form
            className="form-grid"
            onSubmit={async (event) => {
              const savedClaim = isEditMode ? await updateClaim(event) : await createClaim(event);
              if (savedClaim?.id) {
                navigate(`/claims/${savedClaim.id}`);
              }
            }}
          >
            <label>
              <span>Claim number</span>
              <input name="claimNumber" value={claimForm.claimNumber} onChange={handleClaimChange} aria-invalid={Boolean(claimErrors.claimNumber)} />
              {claimErrors.claimNumber ? <span className="field-error">{claimErrors.claimNumber}</span> : null}
            </label>
            <label>
              <span>Linked policy</span>
              <select name="policy" value={claimForm.policy} onChange={handleClaimChange} aria-invalid={Boolean(claimErrors.policy)} disabled={!policies.length}>
                <option value="">Select a policy</option>
                {policies.map((policy) => (
                  <option key={policy.id} value={policy.id}>{policy.policyNumber} — {policy.holderName}</option>
                ))}
              </select>
              {claimErrors.policy ? <span className="field-error">{claimErrors.policy}</span> : null}
            </label>
            <label>
              <span>Incident date</span>
              <input name="incidentDate" type="date" value={claimForm.incidentDate} onChange={handleClaimChange} aria-invalid={Boolean(claimErrors.incidentDate)} />
              {claimErrors.incidentDate ? <span className="field-error">{claimErrors.incidentDate}</span> : null}
            </label>
            <label>
              <span>Amount</span>
              <input name="amount" type="number" min="0" step="0.01" value={claimForm.amount} onChange={handleClaimChange} aria-invalid={Boolean(claimErrors.amount)} />
              {claimErrors.amount ? <span className="field-error">{claimErrors.amount}</span> : null}
            </label>
            <label>
              <span>Status</span>
              <select name="status" value={claimForm.status} onChange={handleClaimChange} aria-invalid={Boolean(claimErrors.status)}>
                <option value="submitted">Submitted</option>
                <option value="under-review">Under review</option>
                <option value="approved">Approved</option>
                <option value="denied">Denied</option>
                <option value="closed">Closed</option>
              </select>
              {claimErrors.status ? <span className="field-error">{claimErrors.status}</span> : null}
            </label>
            <label>
              <span>Assigned to</span>
              <input name="assignedTo" value={claimForm.assignedTo} onChange={handleClaimChange} aria-invalid={Boolean(claimErrors.assignedTo)} />
              {claimErrors.assignedTo ? <span className="field-error">{claimErrors.assignedTo}</span> : null}
            </label>
            <label className="form-grid__wide">
              <span>Description</span>
              <textarea name="description" rows="4" value={claimForm.description} onChange={handleClaimChange} aria-invalid={Boolean(claimErrors.description)} />
              {claimErrors.description ? <span className="field-error">{claimErrors.description}</span> : null}
            </label>
            <button className="button form-grid__wide" type="submit" disabled={claimSaving || !policies.length}>
              {claimSaving ? 'Saving...' : isEditMode ? 'Save claim changes' : 'Create claim'}
            </button>
          </form>
        </article>
      </section>
    </>,
  );
}

function ClaimDetailScreen({ policyLookup, loadClaimDetail, renderProtectedFrame, claimDetail, claimDetailLoading, claimDetailError, deleteClaim, claimDeletingId, addClaimNote, noteForm, handleNoteChange, claimErrors, noteSaving }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [localClaim, setLocalClaim] = useState(null);

  useEffect(() => {
    loadClaimDetail(id).then((loaded) => setLocalClaim(loaded));
  }, [id]);

  const claim = localClaim || claimDetail;
  const linkedPolicy = claim ? policyLookup[claim.policy] : null;

  return renderProtectedFrame(
    <>
      <header className="section-header">
        <div>
          <span className="badge">Claim detail</span>
          <h1>{claim?.claimNumber || 'Claim'}</h1>
        </div>
        <div className="section-header__actions">
          {claim ? (
            <Link className="button" to={`/claims/${claim.id}/edit`}>
              Edit claim
            </Link>
          ) : null}
          {claim ? (
            <button
              className="button button--ghost"
              type="button"
              onClick={async () => {
                const removed = await deleteClaim(id);
                if (removed) {
                  navigate('/claims');
                }
              }}
              disabled={claimDeletingId === id}
            >
              {claimDeletingId === id ? 'Deleting...' : 'Delete claim'}
            </button>
          ) : null}
          <Link className="button button--soft" to="/claims">
            Back to claims
          </Link>
        </div>
      </header>

      {claimDetailLoading ? <div className="loading-card">Loading claim...</div> : null}
      {claimDetailError ? <ErrorAlert message={claimDetailError} /> : null}

      {claim ? (
        <section className="cards">
          <article className="card dashboard-card">
            <div className="dashboard-card__header">
              <div>
                <h2>Claim summary</h2>
                <p>Protected detail fetched from the claims API.</p>
              </div>
              <span className="badge">{claim.status}</span>
            </div>
            <div className="dashboard-preview-item">
              <strong>{claim.claimNumber}</strong>
              <p>{claim.description}</p>
              <div className="task-meta">
                <span>{claim.incidentDate}</span>
                <span>${Number(claim.amount || 0).toFixed(2)}</span>
                <span>{claim.assignedTo || 'Unassigned'}</span>
              </div>
            </div>
          </article>

          <article className="card dashboard-card">
            <div className="dashboard-card__header">
              <div>
                <h2>Linked policy</h2>
                <p>The policy relationship for this claim.</p>
              </div>
            </div>
            {linkedPolicy ? (
              <div className="dashboard-preview-item">
                <strong>{linkedPolicy.policyNumber}</strong>
                <p>{linkedPolicy.holderName}</p>
                <div className="task-meta">
                  <span>{linkedPolicy.type}</span>
                  <span>{linkedPolicy.status}</span>
                  <span>${Number(linkedPolicy.premium || 0).toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="empty">Linked policy details are unavailable.</div>
            )}
          </article>

          <article className="card dashboard-card dashboard-card--wide">
            <div className="dashboard-card__header">
              <div>
                <h2>Claim notes</h2>
                <p>Add a note to demonstrate the protected notes endpoint.</p>
              </div>
              <span className="badge">{Array.isArray(claim.notes) ? claim.notes.length : 0}</span>
            </div>
            <div className="dashboard-preview-list">
              {(claim.notes || []).map((note, index) => (
                <div key={`${note.createdAt || index}-${index}`} className="dashboard-preview-item">
                  <strong>{note.author || 'System'}</strong>
                  <p>{note.text}</p>
                  <div className="task-meta">
                    <span>{note.createdAt || 'No timestamp'}</span>
                  </div>
                </div>
              ))}
              {!claim.notes?.length ? <div className="empty">No notes added yet.</div> : null}
            </div>
            <form
              className="form-grid"
              onSubmit={async (event) => {
                event.preventDefault();
                const saved = await addClaimNote(id);
                if (saved) {
                  const refreshed = await loadClaimDetail(id);
                  setLocalClaim(refreshed);
                }
              }}
            >
              <label className="form-grid__wide">
                <span>New note</span>
                <textarea name="text" rows="3" value={noteForm.text} onChange={handleNoteChange} aria-invalid={Boolean(claimErrors.text)} />
                {claimErrors.text ? <span className="field-error">{claimErrors.text}</span> : null}
              </label>
              <button className="button form-grid__wide" type="submit" disabled={noteSaving}>
                {noteSaving ? 'Saving...' : 'Add note'}
              </button>
            </form>
          </article>
        </section>
      ) : null}
    </>,
  );
}

export default function App() {
  const { user, token, login, logout, isBootstrapping } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const authMode = location.pathname === '/register' ? 'register' : 'login';

  const [summary, setSummary] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [policyForm, setPolicyForm] = useState(blankPolicyForm);
  const [claimForm, setClaimForm] = useState(blankClaimForm);
  const [noteForm, setNoteForm] = useState(blankNoteForm);
  const [authForm, setAuthForm] = useState(blankAuthForm);
  const [error, setError] = useState('');
  const [policyErrors, setPolicyErrors] = useState(blankPolicyErrors);
  const [claimErrors, setClaimErrors] = useState(blankClaimErrors);
  const [authErrors, setAuthErrors] = useState(blankAuthErrors);
  const [policySaving, setPolicySaving] = useState(false);
  const [claimSaving, setClaimSaving] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState('');
  const [editingClaimId, setEditingClaimId] = useState('');
  const [policyDeletingId, setPolicyDeletingId] = useState('');
  const [claimDeletingId, setClaimDeletingId] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [policyDetail, setPolicyDetail] = useState(null);
  const [policyDetailLoading, setPolicyDetailLoading] = useState(false);
  const [policyDetailError, setPolicyDetailError] = useState('');
  const [claimDetail, setClaimDetail] = useState(null);
  const [claimDetailLoading, setClaimDetailLoading] = useState(false);
  const [claimDetailError, setClaimDetailError] = useState('');

  const clearSession = (message = '') => {
    setSummary(null);
    setPolicies([]);
    setClaims([]);
    setPolicyDetail(null);
    setPolicyDetailError('');
    setClaimDetail(null);
    setClaimDetailError('');
    setPolicyForm(blankPolicyForm);
    setClaimForm(blankClaimForm);
    setNoteForm(blankNoteForm);
    setEditingPolicyId('');
    setEditingClaimId('');
    setPolicyDeletingId('');
    setClaimDeletingId('');
    setPolicyErrors(blankPolicyErrors);
    setClaimErrors(blankClaimErrors);
    setAuthErrors(blankAuthErrors);
    logout();
    if (message) {
      setError(message);
    }
  };

  const authFetch = async (url, options = {}, authToken = token) => {
    const response = await requestJson(url, { ...options, token: authToken, auth: true });

    if (response.status === 401) {
      clearSession('Your session expired. Please log in again.');
      throw new Error('Authentication required');
    }

    return response;
  };

  const loadData = async (authToken = token) => {
    try {
      if (!authToken) {
        setSummary(null);
        setPolicies([]);
        setClaims([]);
        return;
      }

      const [summaryRes, policiesRes, claimsRes] = await Promise.all([
        authFetch('/api/dashboard', {}, authToken),
        authFetch('/api/policies', {}, authToken),
        authFetch('/api/claims', {}, authToken),
      ]);

      if (!summaryRes.ok || !policiesRes.ok || !claimsRes.ok) {
        throw new Error('API request failed');
      }

      const summaryJson = await parseJsonResponse(summaryRes);
      const policiesJson = await parseJsonResponse(policiesRes);
      const claimsJson = await parseJsonResponse(claimsRes);
      setSummary(summaryJson);
      setPolicies(policiesJson.policies || []);
      setClaims(claimsJson.claims || []);
    } catch (err) {
      if (err.message !== 'Authentication required') {
        setError(err.message || 'Unable to load dashboard data');
      }
    }
  };

  const loadPolicyDetail = async (policyId) => {
    if (!token) {
      return null;
    }

    setPolicyDetailLoading(true);
    setPolicyDetailError('');

    try {
      const response = await authFetch(`/api/policies/${policyId}`);
      if (!response.ok) {
        throw new Error('Unable to load policy');
      }

      const body = await parseJsonResponse(response);
      setPolicyDetail(body.policy || null);
      return body.policy || null;
    } catch (err) {
      setPolicyDetailError(err.message || 'Unable to load policy');
      return null;
    } finally {
      setPolicyDetailLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData(token);
    }
  }, [token]);

  const handlePolicyChange = (event) => {
    const { name, value } = event.target;
    setPolicyForm((current) => ({ ...current, [name]: value }));
    setPolicyErrors((current) => ({ ...current, [name]: '' }));
  };

  const handleClaimChange = (event) => {
    const { name, value } = event.target;
    setClaimForm((current) => ({ ...current, [name]: value }));
    setClaimErrors((current) => ({ ...current, [name]: '' }));
  };

  const handleNoteChange = (event) => {
    const { name, value } = event.target;
    setNoteForm((current) => ({ ...current, [name]: value }));
    setClaimErrors((current) => ({ ...current, [name]: '' }));
  };

  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((current) => ({ ...current, [name]: value }));
    setAuthErrors((current) => ({ ...current, [name]: '' }));
  };

  const beginPolicyEdit = (policy) => {
    setEditingPolicyId(policy.id);
    setPolicyForm({
      policyNumber: policy.policyNumber || '',
      holderName: policy.holderName || '',
      type: policy.type || 'auto',
      premium: String(policy.premium ?? ''),
      status: policy.status || 'active',
      effectiveDate: policy.effectiveDate || '',
      expirationDate: policy.expirationDate || '',
    });
    setPolicyErrors(blankPolicyErrors);
    setError('');
  };

  const cancelPolicyEdit = () => {
    setEditingPolicyId('');
    setPolicyForm(blankPolicyForm);
    setPolicyErrors(blankPolicyErrors);
    setError('');
  };

  const beginClaimEdit = (claim) => {
    setEditingClaimId(claim.id);
    setClaimForm({
      claimNumber: claim.claimNumber || '',
      policy: claim.policy || '',
      incidentDate: claim.incidentDate || '',
      amount: String(claim.amount ?? ''),
      description: claim.description || '',
      status: claim.status || 'submitted',
      assignedTo: claim.assignedTo || '',
    });
    setClaimErrors(blankClaimErrors);
    setError('');
  };

  const cancelClaimEdit = () => {
    setEditingClaimId('');
    setClaimForm(blankClaimForm);
    setClaimErrors(blankClaimErrors);
    setError('');
  };

  const handleAuthModeChange = (nextMode) => {
    setAuthForm((current) => (nextMode === 'login' ? { ...current, name: '' } : current));
    setAuthErrors(blankAuthErrors);
    setError('');
    navigate(nextMode === 'register' ? '/register' : '/login');
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    const nextErrors = validateAuthForm(authMode, authForm);
    setAuthErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      setError('Please fix the highlighted fields.');
      return;
    }

    setAuthBusy(true);
    setError('');

    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload = authMode === 'register'
        ? { name: authForm.name, email: authForm.email, password: authForm.password, role: authForm.role }
        : { email: authForm.email, password: authForm.password };

      const response = await requestJson(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await normalizeError(response, 'Unable to authenticate'));
      }

      const data = await parseJsonResponse(response);
      const nextSession = { token: data.token, user: data.user };
      login(nextSession);
      setAuthForm(blankAuthForm);
      await loadData(nextSession.token);
    } catch (err) {
      setError(err.message || 'Unable to authenticate');
    } finally {
      setAuthBusy(false);
    }
  };

  const createPolicy = async (event) => {
    event.preventDefault();
    const nextErrors = validatePolicyForm(policyForm);
    setPolicyErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      setError('Please fix the highlighted policy fields.');
      return null;
    }

    setPolicySaving(true);
    setError('');

    try {
      const response = await authFetch('/api/policies', {
        method: 'POST',
        body: JSON.stringify({ ...policyForm, premium: Number(policyForm.premium) }),
      });

      if (!response.ok) {
        throw new Error(await normalizeError(response, 'Unable to create policy'));
      }

      const body = await parseJsonResponse(response);
      const createdPolicy = body.policy || null;

      if (createdPolicy) {
        setPolicies((current) => [createdPolicy, ...current.filter((policy) => policy.id !== createdPolicy.id)]);
        setPolicyDetail(createdPolicy);
      }

      setPolicyForm(blankPolicyForm);
      setPolicyErrors(blankPolicyErrors);
      loadData(token).catch(() => {});
      return createdPolicy;
    } catch (err) {
      setError(err.message || 'Unable to create policy');
      return null;
    } finally {
      setPolicySaving(false);
    }
  };

  const updatePolicy = async (event) => {
    event.preventDefault();
    const nextErrors = validatePolicyForm(policyForm);
    setPolicyErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      setError('Please fix the highlighted policy fields.');
      return null;
    }

    setPolicySaving(true);
    setError('');

    try {
      const response = await authFetch(`/api/policies/${editingPolicyId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...policyForm, premium: Number(policyForm.premium) }),
      });

      if (!response.ok) {
        throw new Error(await normalizeError(response, 'Unable to update policy'));
      }

      const body = await parseJsonResponse(response);
      cancelPolicyEdit();
      await loadData(token);
      return body.policy || null;
    } catch (err) {
      setError(err.message || 'Unable to update policy');
      return null;
    } finally {
      setPolicySaving(false);
    }
  };

  const deletePolicy = async (policyId) => {
    if (!window.confirm('Delete this policy?')) {
      return false;
    }

    setPolicyDeletingId(policyId);
    setError('');

    try {
      const response = await authFetch(`/api/policies/${policyId}`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error(await normalizeError(response, 'Unable to delete policy'));
      }

      if (editingPolicyId === policyId) {
        cancelPolicyEdit();
      }

      if (policyDetail?.id === policyId) {
        setPolicyDetail(null);
      }

      await loadData(token);
      return true;
    } catch (err) {
      setError(err.message || 'Unable to delete policy');
      return false;
    } finally {
      setPolicyDeletingId('');
    }
  };

  const createClaim = async (event) => {
    event.preventDefault();
    const nextErrors = validateClaimForm(claimForm);
    setClaimErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      setError('Please fix the highlighted claim fields.');
      return null;
    }

    setClaimSaving(true);
    setError('');

    try {
      const response = await authFetch('/api/claims', {
        method: 'POST',
        body: JSON.stringify({ ...claimForm, amount: Number(claimForm.amount) }),
      });

      if (!response.ok) {
        throw new Error(await normalizeError(response, 'Unable to create claim'));
      }

      const body = await parseJsonResponse(response);
      const createdClaim = body.claim || null;

      if (createdClaim) {
        setClaims((current) => [createdClaim, ...current.filter((claim) => claim.id !== createdClaim.id)]);
        setClaimDetail(createdClaim);
      }

      setClaimForm(blankClaimForm);
      setClaimErrors(blankClaimErrors);
      loadData(token).catch(() => {});
      return createdClaim;
    } catch (err) {
      setError(err.message || 'Unable to create claim');
      return null;
    } finally {
      setClaimSaving(false);
    }
  };

  const updateClaim = async (event) => {
    event.preventDefault();
    const nextErrors = validateClaimForm(claimForm);
    setClaimErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      setError('Please fix the highlighted claim fields.');
      return null;
    }

    setClaimSaving(true);
    setError('');

    try {
      const response = await authFetch(`/api/claims/${editingClaimId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...claimForm, amount: Number(claimForm.amount) }),
      });

      if (!response.ok) {
        throw new Error(await normalizeError(response, 'Unable to update claim'));
      }

      const body = await parseJsonResponse(response);
      cancelClaimEdit();
      setClaimDetail(body.claim || null);
      await loadData(token);
      return body.claim || null;
    } catch (err) {
      setError(err.message || 'Unable to update claim');
      return null;
    } finally {
      setClaimSaving(false);
    }
  };

  const deleteClaim = async (claimId) => {
    if (!window.confirm('Delete this claim?')) {
      return false;
    }

    setClaimDeletingId(claimId);
    setError('');

    try {
      const response = await authFetch(`/api/claims/${claimId}`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error(await normalizeError(response, 'Unable to delete claim'));
      }

      if (editingClaimId === claimId) {
        cancelClaimEdit();
      }

      if (claimDetail?.id === claimId) {
        setClaimDetail(null);
      }

      await loadData(token);
      return true;
    } catch (err) {
      setError(err.message || 'Unable to delete claim');
      return false;
    } finally {
      setClaimDeletingId('');
    }
  };

  const loadClaimDetail = async (claimId) => {
    if (!token) {
      return null;
    }

    setClaimDetailLoading(true);
    setClaimDetailError('');

    try {
      const response = await authFetch(`/api/claims/${claimId}`);
      if (!response.ok) {
        throw new Error('Unable to load claim');
      }

      const body = await parseJsonResponse(response);
      setClaimDetail(body.claim || null);
      return body.claim || null;
    } catch (err) {
      setClaimDetailError(err.message || 'Unable to load claim');
      return null;
    } finally {
      setClaimDetailLoading(false);
    }
  };

  const addClaimNote = async (claimId) => {
    const nextErrors = validateNoteForm(noteForm);
    setClaimErrors((current) => ({ ...current, text: nextErrors.text }));

    if (nextErrors.text) {
      setError('Please enter a note before submitting.');
      return false;
    }

    setNoteSaving(true);
    setError('');

    try {
      const response = await authFetch(`/api/claims/${claimId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ text: noteForm.text }),
      });

      if (!response.ok) {
        throw new Error(await normalizeError(response, 'Unable to add note'));
      }

      const body = await parseJsonResponse(response);
      setClaimDetail(body.claim || null);
      setNoteForm(blankNoteForm);
      await loadData(token);
      return true;
    } catch (err) {
      setError(err.message || 'Unable to add note');
      return false;
    } finally {
      setNoteSaving(false);
    }
  };

  const policyLookup = useMemo(
    () => Object.fromEntries(policies.map((policy) => [policy.id, policy])),
    [policies],
  );

  const recentPolicies = policies.slice(0, 3);
  const recentClaims = claims.slice(0, 4);
  const dashboardMetrics = [
    { label: 'Policies', value: summary?.totalPolicies ?? policies.length },
    { label: 'Claims', value: summary?.totalClaims ?? claims.length },
    { label: 'Active policies', value: summary?.policyStatuses?.active ?? policies.filter((policy) => policy.status === 'active').length },
    { label: 'Under review', value: summary?.claimStatuses?.underReview ?? claims.filter((claim) => claim.status === 'under-review').length },
  ];

  const renderProtectedFrame = (children) => (
    <div className="page">
      <Navbar />
      {children}
    </div>
  );

  const renderAuthScreen = (mode) => {
    const title = mode === 'login' ? 'Welcome back' : 'Create your account';
    const message = mode === 'login'
      ? 'Log in to access your dashboard, policies, and claims.'
      : 'Register to create your account and start tracking policies and claims.';

    return (
      <div className="page auth-page">
        <section className="auth-hero">
          <span className="badge">Policy Claims Tracker</span>
          <h1>{title}</h1>
          <p>{message}</p>
        </section>

        <ErrorAlert message={error} />

        <AuthForm
          mode={mode}
          form={authForm}
          submitting={authBusy}
          errors={authErrors}
          onChange={handleAuthChange}
          onModeChange={handleAuthModeChange}
          onSubmit={submitAuth}
        />
      </div>
    );
  };

  const renderPoliciesScreen = () => renderProtectedFrame(
    <>
      <header className="section-header">
        <div>
          <span className="badge">Policies</span>
          <h1>Policies</h1>
        </div>
        <div className="section-header__actions">
          <Link className="button" to="/policies/new">
            Create policy
          </Link>
          <Link className="button button--soft" to="/claims">
            Go to claims
          </Link>
        </div>
      </header>

      <ErrorAlert message={error} />

      <section className="grid grid--single">
        <article className="panel">
          <h2>All policies</h2>
          <div className="cards cards--stacked">
            {policies.map((policy) => (
              <article key={policy.id} className="card">
                <h3>{policy.policyNumber}</h3>
                <p>{policy.holderName}</p>
                <div className="task-meta">
                  <span>{policy.type}</span>
                  <span>{policy.status}</span>
                  <span>${Number(policy.premium || 0).toFixed(2)}</span>
                  <span>{policy.effectiveDate || 'No effective date'}</span>
                </div>
                <div className="card-actions">
                  <Link className="button" to={`/policies/${policy.id}`}>
                    Open
                  </Link>
                  <Link className="button button--soft" to={`/policies/${policy.id}/edit`}>
                    Edit
                  </Link>
                  <button
                    className="button button--ghost"
                    type="button"
                    onClick={() => deletePolicy(policy.id)}
                    disabled={policyDeletingId === policy.id}
                  >
                    {policyDeletingId === policy.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </article>
            ))}
            {!policies.length ? <div className="empty">No policies available yet.</div> : null}
          </div>
        </article>
      </section>
    </>
  );

  const renderClaimsScreen = () => renderProtectedFrame(
    <>
      <header className="section-header">
        <div>
          <span className="badge">Claims</span>
          <h1>Claims</h1>
        </div>
        <div className="section-header__actions">
          <Link className="button" to="/claims/new">
            Create claim
          </Link>
          <Link className="button button--soft" to="/policies">
            Go to policies
          </Link>
        </div>
      </header>

      <ErrorAlert message={error} />

      <section className="grid grid--single">
        <article className="panel">
          <h2>All claims</h2>
          <div className="cards cards--stacked">
            {claims.map((claim) => (
              <article key={claim.id} className="card">
                <h3>{claim.claimNumber}</h3>
                <p>{claim.description}</p>
                <div className="task-meta">
                  <span>{claim.status}</span>
                  <span>{policyLookup[claim.policy]?.policyNumber || claim.policy}</span>
                  <span>${Number(claim.amount || 0).toFixed(2)}</span>
                  <span>{claim.incidentDate}</span>
                </div>
                <div className="card-actions">
                  <Link className="button" to={`/claims/${claim.id}`}>
                    Open
                  </Link>
                  <Link className="button button--soft" to={`/claims/${claim.id}/edit`}>
                    Edit
                  </Link>
                  <button
                    className="button button--ghost"
                    type="button"
                    onClick={() => deleteClaim(claim.id)}
                    disabled={claimDeletingId === claim.id}
                  >
                    {claimDeletingId === claim.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </article>
            ))}
            {!claims.length ? <div className="empty">No claims available yet.</div> : null}
          </div>
        </article>
      </section>
    </>
  );

  const renderDashboardScreen = () => (
    <div className="page">
      <Navbar />
      <Hero
        user={user}
        badgeLabel="Policy Claims Tracker"
        title={user?.name ? `Welcome, ${user.name}.` : 'Policy Claims Tracker'}
        description="Use the protected dashboard to monitor policies, claims, and API-backed insurance activity."
        metrics={dashboardMetrics}
      />

      <ErrorAlert message={error} />

      <header className="section-header">
        <div>
          <span className="badge">Overview</span>
          <h1>Dashboard</h1>
        </div>
        <div className="section-header__actions">
          <Link className="button" to="/policies">
            Manage policies
          </Link>
          <Link className="button button--soft" to="/claims">
            Manage claims
          </Link>
        </div>
      </header>

      <section className="cards dashboard-overview">
        <article className="card dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <h2>Recent policies</h2>
              <p>Use these records during the live walkthrough.</p>
            </div>
            <span className="badge">{recentPolicies.length}</span>
          </div>
          <div className="dashboard-preview-list">
            {recentPolicies.map((policy) => (
              <Link key={policy.id} to={`/policies/${policy.id}`} className="dashboard-preview-item">
                <strong>{policy.policyNumber}</strong>
                <p>{policy.holderName}</p>
                <div className="task-meta">
                  <span>{policy.type}</span>
                  <span>{policy.status}</span>
                  <span>${Number(policy.premium || 0).toFixed(2)}</span>
                </div>
              </Link>
            ))}
            {!recentPolicies.length ? <div className="empty">No policies available.</div> : null}
          </div>
        </article>

        <article className="card dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <h2>Recent claims</h2>
              <p>Open one to show detail and protected request flow.</p>
            </div>
            <span className="badge">{recentClaims.length}</span>
          </div>
          <div className="dashboard-preview-list">
            {recentClaims.map((claim) => (
              <Link key={claim.id} to={`/claims/${claim.id}`} className="dashboard-preview-item">
                <strong>{claim.claimNumber}</strong>
                <p>{claim.description}</p>
                <div className="task-meta">
                  <span>{claim.status}</span>
                  <span>{policyLookup[claim.policy]?.policyNumber || claim.policy}</span>
                  <span>${Number(claim.amount || 0).toFixed(2)}</span>
                </div>
              </Link>
            ))}
            {!recentClaims.length ? <div className="empty">No claims available.</div> : null}
          </div>
        </article>

        <article className="card dashboard-card dashboard-card--wide">
          <div className="dashboard-card__header">
            <div>
              <h2>Claim status breakdown</h2>
              <p>Use this to explain the dashboard aggregation endpoint.</p>
            </div>
          </div>
          <div className="task-meta">
            <span>Submitted: {summary?.claimStatuses?.submitted ?? 0}</span>
            <span>Under review: {summary?.claimStatuses?.underReview ?? 0}</span>
            <span>Approved: {summary?.claimStatuses?.approved ?? 0}</span>
            <span>Denied: {summary?.claimStatuses?.denied ?? 0}</span>
            <span>Closed: {summary?.claimStatuses?.closed ?? 0}</span>
          </div>
        </article>
      </section>
    </div>
  );

  if (isBootstrapping) {
    return (
      <div className="page auth-page">
        <div className="loading-card">Checking your session...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : renderAuthScreen('login')} />
      <Route path="/register" element={token ? <Navigate to="/" replace /> : renderAuthScreen('register')} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            {renderDashboardScreen()}
          </ProtectedRoute>
        }
      />
      <Route
        path="/policies"
        element={
          <ProtectedRoute>
            {renderPoliciesScreen()}
          </ProtectedRoute>
        }
      />
      <Route
        path="/policies/new"
        element={
          <ProtectedRoute>
            <PolicyFormScreen
              policies={policies}
              cancelPolicyEdit={cancelPolicyEdit}
              beginPolicyEdit={beginPolicyEdit}
              loadPolicyDetail={loadPolicyDetail}
              renderProtectedFrame={renderProtectedFrame}
              error={error}
              policyDetailError={policyDetailError}
              policyDetailLoading={policyDetailLoading}
              editingPolicyId={editingPolicyId}
              policyForm={policyForm}
              handlePolicyChange={handlePolicyChange}
              policyErrors={policyErrors}
              policySaving={policySaving}
              updatePolicy={updatePolicy}
              createPolicy={createPolicy}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/policies/:id/edit"
        element={
          <ProtectedRoute>
            <PolicyFormScreen
              policies={policies}
              cancelPolicyEdit={cancelPolicyEdit}
              beginPolicyEdit={beginPolicyEdit}
              loadPolicyDetail={loadPolicyDetail}
              renderProtectedFrame={renderProtectedFrame}
              error={error}
              policyDetailError={policyDetailError}
              policyDetailLoading={policyDetailLoading}
              editingPolicyId={editingPolicyId}
              policyForm={policyForm}
              handlePolicyChange={handlePolicyChange}
              policyErrors={policyErrors}
              policySaving={policySaving}
              updatePolicy={updatePolicy}
              createPolicy={createPolicy}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/policies/:id"
        element={
          <ProtectedRoute>
            <PolicyDetailScreen
              policies={policies}
              claims={claims}
              loadPolicyDetail={loadPolicyDetail}
              renderProtectedFrame={renderProtectedFrame}
              policyDetail={policyDetail}
              policyDetailLoading={policyDetailLoading}
              policyDetailError={policyDetailError}
              deletePolicy={deletePolicy}
              policyDeletingId={policyDeletingId}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/claims"
        element={
          <ProtectedRoute>
            {renderClaimsScreen()}
          </ProtectedRoute>
        }
      />
      <Route
        path="/claims/new"
        element={
          <ProtectedRoute>
            <ClaimFormScreen
              claims={claims}
              policies={policies}
              cancelClaimEdit={cancelClaimEdit}
              beginClaimEdit={beginClaimEdit}
              loadClaimDetail={loadClaimDetail}
              renderProtectedFrame={renderProtectedFrame}
              error={error}
              claimDetailError={claimDetailError}
              claimDetailLoading={claimDetailLoading}
              editingClaimId={editingClaimId}
              claimForm={claimForm}
              handleClaimChange={handleClaimChange}
              claimErrors={claimErrors}
              claimSaving={claimSaving}
              updateClaim={updateClaim}
              createClaim={createClaim}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/claims/:id/edit"
        element={
          <ProtectedRoute>
            <ClaimFormScreen
              claims={claims}
              policies={policies}
              cancelClaimEdit={cancelClaimEdit}
              beginClaimEdit={beginClaimEdit}
              loadClaimDetail={loadClaimDetail}
              renderProtectedFrame={renderProtectedFrame}
              error={error}
              claimDetailError={claimDetailError}
              claimDetailLoading={claimDetailLoading}
              editingClaimId={editingClaimId}
              claimForm={claimForm}
              handleClaimChange={handleClaimChange}
              claimErrors={claimErrors}
              claimSaving={claimSaving}
              updateClaim={updateClaim}
              createClaim={createClaim}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/claims/:id"
        element={
          <ProtectedRoute>
            <ClaimDetailScreen
              policyLookup={policyLookup}
              loadClaimDetail={loadClaimDetail}
              renderProtectedFrame={renderProtectedFrame}
              claimDetail={claimDetail}
              claimDetailLoading={claimDetailLoading}
              claimDetailError={claimDetailError}
              deleteClaim={deleteClaim}
              claimDeletingId={claimDeletingId}
              addClaimNote={addClaimNote}
              noteForm={noteForm}
              handleNoteChange={handleNoteChange}
              claimErrors={claimErrors}
              noteSaving={noteSaving}
            />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
