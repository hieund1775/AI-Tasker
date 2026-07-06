namespace AITasker_Modular.Modules.UserModule.DTOs;

public class UpdateUserDto
{
    public string? FullName { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Status { get; set; }
    public string? Role { get; set; }
    
    [System.ComponentModel.DataAnnotations.RegularExpression(@"^0[0-9]{9}$", ErrorMessage = "Số điện thoại không đúng định dạng (10 số, bắt đầu bằng số 0).")]
    public string? PhoneNumber { get; set; }
}
