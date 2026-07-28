namespace AITasker_Modular.Modules.UserModule.DTOs;

public class RegisterDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = "Client";
    
    [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Số điện thoại là bắt buộc.")]
    [System.ComponentModel.DataAnnotations.RegularExpression(@"^0[0-9]{9}$", ErrorMessage = "Số điện thoại không đúng định dạng (10 số, bắt đầu bằng số 0).")]
    public string PhoneNumber { get; set; } = string.Empty;
}
