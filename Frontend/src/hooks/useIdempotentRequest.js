/**
 * Custom hook for handling idempotent requests
 * Simplifies duplicate prevention and request state management
 */

import { useState, useCallback, useRef } from "react";
import {
  checkForDuplicateSubmission,
  idempotentPost,
  idempotentPut,
  idempotentPatch,
  idempotentDelete,
} from "../api/idempotentApi.js";

/**
 * Hook for making idempotent API requests with state management
 * @param {Function} apiFunction - The API function to call
 * @param {Object} options - Configuration options
 * @param {string} options.operationId - Unique identifier for the operation
 * @param {boolean} options.preventDuplicates - Check for duplicate submissions (default: true)
 * @returns {Object} Hook state and functions
 */
export const useIdempotentRequest = (apiFunction, options = {}) => {
  const { operationId, preventDuplicates = true } = options;

  const [state, setState] = useState({
    loading: false,
    error: null,
    data: null,
    isDuplicate: false,
    isDuplicateError: false,
  });

  const requestInProgressRef = useRef(false);
  const lastSubmitTimeRef = useRef(null);
  const MIN_SUBMIT_INTERVAL = 1000; // Minimum 1 second between submissions

  const submit = useCallback(
    async (payload, config = {}) => {
      // Check if request is already in progress
      if (requestInProgressRef.current) {
        setState((prev) => ({
          ...prev,
          isDuplicateError: true,
          error: "Request already in progress",
        }));
        return null;
      }

      // Check for rapid successive submissions
      const now = Date.now();
      if (
        lastSubmitTimeRef.current &&
        now - lastSubmitTimeRef.current < MIN_SUBMIT_INTERVAL
      ) {
        setState((prev) => ({
          ...prev,
          isDuplicateError: true,
          error: "Please wait before submitting again",
        }));
        return null;
      }

      // Check for duplicate submission
      if (preventDuplicates && operationId && payload) {
        const { isDuplicate } = checkForDuplicateSubmission(
          operationId,
          payload,
        );

        if (isDuplicate) {
          setState((prev) => ({
            ...prev,
            isDuplicate: true,
            isDuplicateError: true,
            error: "This request is already being processed. Please wait.",
          }));
          return null;
        }
      }

      requestInProgressRef.current = true;
      lastSubmitTimeRef.current = now;

      setState({
        loading: true,
        error: null,
        data: null,
        isDuplicate: false,
        isDuplicateError: false,
      });

      try {
        const response = await apiFunction(payload, config);

        setState({
          loading: false,
          error: null,
          data: response.data,
          isDuplicate: false,
          isDuplicateError: false,
        });

        return response.data;
      } catch (error) {
        const errorMessage =
          error?.response?.data?.message ||
          error?.message ||
          "An error occurred";
        const isDuplicateRequestError =
          error?.response?.status === 409 || // Conflict status
          errorMessage.toLowerCase().includes("already being processed") ||
          errorMessage.toLowerCase().includes("duplicate request");

        setState({
          loading: false,
          error: errorMessage,
          data: null,
          isDuplicate: isDuplicateRequestError,
          isDuplicateError: isDuplicateRequestError,
        });

        throw error;
      } finally {
        requestInProgressRef.current = false;
      }
    },
    [apiFunction, operationId, preventDuplicates],
  );

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      data: null,
      isDuplicate: false,
      isDuplicateError: false,
    });
    requestInProgressRef.current = false;
  }, []);

  return {
    ...state,
    submit,
    reset,
    isLoading: state.loading,
  };
};

/**
 * Hook for making idempotent POST requests
 * @param {string} url - API endpoint URL
 * @param {Object} options - Configuration options (see useIdempotentRequest)
 * @returns {Object} Hook state and submit function
 */
export const useIdempotentPost = (url, options = {}) => {
  const apiFunction = useCallback(
    (payload, config) =>
      idempotentPost(url, payload, {
        operationId: options.operationId,
        ...config,
      }),
    [url, options.operationId],
  );

  return useIdempotentRequest(apiFunction, options);
};

/**
 * Hook for making idempotent PUT requests
 * @param {string} url - API endpoint URL
 * @param {Object} options - Configuration options (see useIdempotentRequest)
 * @returns {Object} Hook state and submit function
 */
export const useIdempotentPut = (url, options = {}) => {
  const apiFunction = useCallback(
    (payload, config) =>
      idempotentPut(url, payload, {
        operationId: options.operationId,
        ...config,
      }),
    [url, options.operationId],
  );

  return useIdempotentRequest(apiFunction, options);
};

/**
 * Hook for making idempotent PATCH requests
 * @param {string} url - API endpoint URL
 * @param {Object} options - Configuration options (see useIdempotentRequest)
 * @returns {Object} Hook state and submit function
 */
export const useIdempotentPatch = (url, options = {}) => {
  const apiFunction = useCallback(
    (payload, config) =>
      idempotentPatch(url, payload, {
        operationId: options.operationId,
        ...config,
      }),
    [url, options.operationId],
  );

  return useIdempotentRequest(apiFunction, options);
};

/**
 * Hook for making idempotent DELETE requests
 * @param {string} url - API endpoint URL
 * @param {Object} options - Configuration options (see useIdempotentRequest)
 * @returns {Object} Hook state and submit function
 */
export const useIdempotentDelete = (url, options = {}) => {
  const apiFunction = useCallback(
    (payload, config) =>
      idempotentDelete(url, { operationId: options.operationId, ...config }),
    [url, options.operationId],
  );

  return useIdempotentRequest(apiFunction, options);
};

/**
 * Hook for managing form submission with idempotency
 * Combines form state and idempotent request handling
 * @param {Function} onSubmit - Callback function that receives form data
 * @param {Object} options - Configuration options
 * @param {string} options.operationId - Unique identifier for the operation
 * @param {boolean} options.preventDuplicates - Check for duplicate submissions (default: true)
 * @returns {Object} Form state and handlers
 */
export const useIdempotentForm = (onSubmit, options = {}) => {
  const { operationId, preventDuplicates = true } = options;

  const [formState, setFormState] = useState({
    values: {},
    touched: {},
    errors: {},
  });

  const {
    loading: isSubmitting,
    error: submitError,
    isDuplicateError,
    submit: executeSubmit,
    reset: resetSubmit,
  } = useIdempotentRequest(onSubmit, { operationId, preventDuplicates });

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault?.();

      if (submitError && isDuplicateError) {
        // Reset duplicate error after showing it
        resetSubmit();
        return;
      }

      try {
        await executeSubmit(formState.values);
      } catch {
        // Error is already handled in the hook
      }
    },
    [
      formState.values,
      submitError,
      isDuplicateError,
      executeSubmit,
      resetSubmit,
    ],
  );

  const setFieldValue = useCallback((field, value) => {
    setFormState((prev) => ({
      ...prev,
      values: { ...prev.values, [field]: value },
      touched: { ...prev.touched, [field]: true },
    }));
  }, []);

  const setFieldError = useCallback((field, error) => {
    setFormState((prev) => ({
      ...prev,
      errors: { ...prev.errors, [field]: error },
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormState({
      values: {},
      touched: {},
      errors: {},
    });
    resetSubmit();
  }, [resetSubmit]);

  return {
    values: formState.values,
    touched: formState.touched,
    errors: formState.errors,
    isSubmitting,
    submitError,
    isDuplicateError,
    handleSubmit,
    setFieldValue,
    setFieldError,
    resetForm,
  };
};
