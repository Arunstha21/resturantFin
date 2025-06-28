import { toast } from "sonner"

export const showSuccessToast = (message: string) => {
  toast.success(message, {
    duration: 3000,
  })
}

export const showErrorToast = (message: string) => {
  toast.error(message, {
    duration: 4000,
  })
}

export const showInfoToast = (message: string) => {
  toast.info(message, {
    duration: 3000,
  })
}

export const showLoadingToast = (message: string) => {
  return toast.loading(message)
}

export const showPromiseToast = <T,>(
  promise: Promise<T>,
  {
    loading,
    success,
    error,
  }: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: any) => string)
  },
) => {
  return toast.promise(promise, {
    loading,
    success,
    error,
  })
}
