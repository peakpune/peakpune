const button = document.querySelector('[data-copy-upi]');
if (button) {
  const status = document.querySelector('.mt-copy-status');
  button.addEventListener('click', async () => {
    const value = button.dataset.copyUpi;
    try {
      await navigator.clipboard.writeText(value);
      status.textContent = 'Copied';
    } catch {
      const field = document.createElement('textarea');
      field.value = value;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.append(field);
      field.select();
      const copied = document.execCommand('copy');
      field.remove();
      status.textContent = copied ? 'Copied' : 'Copy unavailable. Select the UPI ID above.';
    }
  });
}
